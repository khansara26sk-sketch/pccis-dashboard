
"""Isolated PaddleOCR worker for the PCCIS backend."""

import json
import sys

from paddleocr import PaddleOCR


def main():
    image_path = sys.argv[1]

    ocr = PaddleOCR(
        use_textline_orientation=True,
        lang="en",
    )

    results = ocr.predict(input=image_path)

    extracted_lines = []
    confidences = []

    for result in results:
        data = result.json

        if isinstance(data, str):
            data = json.loads(data)

        if "res" in data:
            data = data["res"]

        texts = data.get("rec_texts", [])
        scores = data.get("rec_scores", [])

        for index, text in enumerate(texts):
            if not str(text).strip():
                continue

            extracted_lines.append(str(text).strip())

            if index < len(scores):
                confidences.append(float(scores[index]))

    output = {
        "text": "\n".join(extracted_lines),
        "confidence": (
            sum(confidences) / len(confidences)
            if confidences else None
        ),
    }

    print("PCCIS_OCR_RESULT:" + json.dumps(output))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(
            "PCCIS_OCR_ERROR:" + str(exc),
            file=sys.stderr,
        )
        sys.exit(1)
