"""Chấm phần dịch Việt → Nhật của đề ngữ pháp Minna: đọc ảnh bài viết tay và chấm từng câu bằng Claude.

Cần thư viện anthropic (py -m pip install anthropic) và API key của bạn trong biến môi trường ANTHROPIC_API_KEY.
Mỗi lần chấm là một yêu cầu tới Claude Opus 5.5 (tính phí theo token của tài khoản Anthropic của bạn).
"""
import json

MODEL = "claude-opus-5-5"

HUONG_DAN = """Bạn là giáo viên tiếng Nhật chấm bài cho một người Việt đang học Minna no Nihongo (trình độ {cap}).
Học viên được cho các câu tiếng Việt (có đánh số), mỗi câu phải dịch sang tiếng Nhật và dùng đúng một mẫu ngữ pháp cho trước.
Họ viết tay câu trả lời ra giấy, có ghi số câu, rồi chụp ảnh. Ảnh bài làm ở trên, danh sách câu hỏi ở dưới.

Với từng câu trong danh sách:
1. Tìm câu trả lời có cùng số trong ảnh. Chép lại đúng những gì học viên viết (kể cả chỗ sai), không tự sửa. Chữ nào không đọc được thì ghi [?].
2. Chấm:
   - "dung": câu đúng ngữ pháp, dùng đúng mẫu được yêu cầu và đúng nghĩa câu tiếng Việt. Câu mẫu chỉ là một đáp án tham khảo: chấp nhận cách nói khác nếu đúng, viết kanji hay hiragana đều được, có thể bỏ chủ ngữ hay thay từ đồng nghĩa.
   - "gan_dung": dùng đúng mẫu nhưng có một lỗi nhỏ không làm sai mẫu (sai một trợ từ, viết nhầm một chữ kana, thiếu ます…).
   - "sai": không dùng mẫu được yêu cầu, chia sai dạng của mẫu, hoặc sai nghĩa.
   - "bo_trong": không tìm thấy câu trả lời cho số câu đó.
3. "giai_thich": bằng tiếng Việt, ngắn gọn (1–2 câu), nói rõ lỗi ở đâu và vì sao; câu đúng thì khen ngắn hoặc để trống.
4. "cau_dung": câu tiếng Nhật đúng gần nhất với cách học viên viết (sửa ít nhất có thể); câu đã đúng thì chép lại câu đó.
Cuối cùng "nhan_xet": 1–3 câu tiếng Việt nhận xét chung, chỉ ra mẫu học viên hay sai nhất (nếu có).
Chấm công bằng: không bắt lỗi chữ viết xấu hay nét chữ nếu vẫn đọc được."""

SCHEMA = {
    "type": "object",
    "properties": {
        "items": {"type": "array", "items": {
            "type": "object",
            "properties": {
                "so": {"type": "integer"},
                "doc_duoc": {"type": "string"},
                "ket_qua": {"type": "string", "enum": ["dung", "gan_dung", "sai", "bo_trong"]},
                "giai_thich": {"type": "string"},
                "cau_dung": {"type": "string"},
            },
            "required": ["so", "doc_duoc", "ket_qua", "giai_thich", "cau_dung"],
            "additionalProperties": False,
        }},
        "nhan_xet": {"type": "string"},
    },
    "required": ["items", "nhan_xet"],
    "additionalProperties": False,
}


class LoiCham(Exception):
    """Lỗi có lời nhắn tiếng Việt để hiện cho người học."""


def cham(cap, items, images):
    """items: [{so, vi, mau, y_nghia, dap_an}], images: ["data:image/jpeg;base64,..."]. Trả về {items, nhan_xet}."""
    try:
        import anthropic
    except ImportError:
        raise LoiCham("Máy chưa có thư viện anthropic. Chạy: py -m pip install anthropic, rồi mở lại server.")
    if not images:
        raise LoiCham("Chưa có ảnh bài làm.")
    content = []
    for url in images[:6]:
        head, _, data = url.partition(",")
        media = head[5:].split(";")[0] if head.startswith("data:") else "image/jpeg"
        if media not in ("image/jpeg", "image/png", "image/webp", "image/gif") or not data:
            raise LoiCham("Ảnh không đúng định dạng.")
        content.append({"type": "image", "source": {"type": "base64", "media_type": media, "data": data}})
    ds = [{"so": int(x["so"]), "cau_tieng_viet": str(x["vi"]), "mau_can_dung": str(x["mau"]),
           "y_nghia_mau": str(x.get("y_nghia", "")), "cau_mau_tham_khao": str(x["dap_an"])} for x in items[:80]]
    content.append({"type": "text", "text": "Danh sách câu hỏi:\n" + json.dumps(ds, ensure_ascii=False, indent=1)})
    try:
        client = anthropic.Anthropic()
        r = client.beta.messages.create(
            model=MODEL,
            max_tokens=16000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            output_config={"effort": "medium", "format": {"type": "json_schema", "schema": SCHEMA}},
            system=HUONG_DAN.format(cap="N5" if cap == "n5" else "N4"),
            messages=[{"role": "user", "content": content}],
        )
    except anthropic.AuthenticationError:
        raise LoiCham("API key không hợp lệ. Kiểm tra lại biến môi trường ANTHROPIC_API_KEY.")
    except anthropic.PermissionDeniedError:
        raise LoiCham("API key không có quyền dùng model này.")
    except anthropic.RateLimitError:
        raise LoiCham("Đang bị giới hạn số lượt gọi. Thử lại sau ít phút.")
    except anthropic.BadRequestError as e:
        raise LoiCham("Yêu cầu bị từ chối: " + str(e.message)[:200])
    except anthropic.APIStatusError as e:
        raise LoiCham(f"Máy chủ Anthropic báo lỗi {e.status_code}. Thử lại sau.")
    except anthropic.APIConnectionError:
        raise LoiCham("Không kết nối được tới Anthropic. Kiểm tra mạng.")
    except Exception as e:  # thiếu key khi tạo client…
        if "api_key" in str(e) or "authentication" in str(e).lower():
            raise LoiCham("Chưa có API key. Đặt biến môi trường ANTHROPIC_API_KEY rồi mở lại server.")
        raise LoiCham("Lỗi khi gọi Claude: " + str(e)[:200])
    if r.stop_reason == "refusal":
        raise LoiCham("Claude từ chối chấm bài này. Thử chụp lại ảnh rõ hơn.")
    if r.stop_reason == "max_tokens":
        raise LoiCham("Bài quá dài, câu trả lời bị cắt. Thử chia ảnh ra chấm làm hai lần.")
    text = next((b.text for b in r.content if b.type == "text"), "")
    try:
        return json.loads(text)
    except ValueError:
        raise LoiCham("Kết quả chấm không đọc được. Thử lại.")
