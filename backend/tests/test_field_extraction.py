from app.services.field_extraction_service import extract_product_fields


def test_extract_all_product_fields():
    text = """Product Name: Paracetamol
Batch No: B123
Mfg Date: 01/2025
Expiry Date: 01/2027"""

    result = extract_product_fields(text)

    assert result.product_name == "Paracetamol"
    assert result.batch_number == "B123"
    assert result.manufacturing_date == "01/2025"
    assert result.expiry_date == "01/2027"


def test_missing_fields_return_none():
    text = "Product Name: Soap"

    result = extract_product_fields(text)

    assert result.product_name == "Soap"
    assert result.batch_number is None
    assert result.manufacturing_date is None
    assert result.expiry_date is None


def test_empty_ocr_text():
    result = extract_product_fields("")

    assert result.product_name is None
    assert result.batch_number is None
    assert result.manufacturing_date is None
    assert result.expiry_date is None


def test_partial_ocr_text():
    text = """Batch No: LOT-456
Expiry Date: 12/2027"""

    result = extract_product_fields(text)

    assert result.product_name is None
    assert result.batch_number == "LOT-456"
    assert result.manufacturing_date is None
    assert result.expiry_date == "12/2027"


def test_alternate_labels():
    text = """Item Name: Shampoo
Lot No: L998
Manufactured: 02/2025
Best Before: 02/2028"""

    result = extract_product_fields(text)

    assert result.product_name == "Shampoo"
    assert result.batch_number == "L998"
    assert result.manufacturing_date == "02/2025"
    assert result.expiry_date == "02/2028"
