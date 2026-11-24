from app.services.field_extraction_service import (
    extract_product_fields,
    get_field_status,
    _choose_field,
    ExtractedProductFields,
)


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

def test_batch_number_label_variations():
    test_cases = [
        ("Batch No.: AB-123", "AB-123"),
        ("BATCH NO AB123", "AB123"),
        ("Batch Number: LOT-456", "LOT-456"),
        ("Lot No.: PKG/2025", "PKG/2025"),
    ]

    for text, expected_batch in test_cases:
        result = extract_product_fields(text)
        assert result.batch_number == expected_batch

def test_product_name_label_variations():
    test_cases = [
        ("Product: Haldiram Bhujia", "Haldiram Bhujia"),
        ("Product Name: Bikano Namkeen", "Bikano Namkeen"),
        ("Item Name: Shampoo", "Shampoo"),
    ]

    for text, expected_name in test_cases:
        result = extract_product_fields(text)
        assert result.product_name == expected_name

def test_manufacturer_label_variations():
    test_cases = [
        ("Mfd. by: ABC Foods Pvt Ltd", "ABC Foods Pvt Ltd"),
        ("Mfg. by: XYZ Industries", "XYZ Industries"),
        ("Manufactured by: Sample Company", "Sample Company"),
    ]

    for text, expected_manufacturer in test_cases:
        result = extract_product_fields(text)
        assert result.manufacturer == expected_manufacturer

def test_address_label_variations():
    test_cases = [
        ("Factory Address: Delhi, India", "Delhi, India"),
        ("Registered Address: Noida, UP", "Noida, UP"),
        ("Address: Mumbai, Maharashtra", "Mumbai, Maharashtra"),
    ]

    for text, expected_address in test_cases:
        result = extract_product_fields(text)
        assert result.address == expected_address

def test_net_quantity_label_variations():
    test_cases = [
        ("Net Qty: 200 g", "200 g"),
        ("Net Weight: 500 ml", "500 ml"),
        ("Net Content: 1 kg", "1 kg"),
        ("Net Quantity: 250 g", "250 g"),
    ]

    for text, expected_quantity in test_cases:
        result = extract_product_fields(text)
        assert result.net_quantity == expected_quantity

def test_mrp_label_variations():
    test_cases = [
        ("MRP: Rs. 50", "50"),
        ("MRP ₹100", "100"),
        ("Maximum Retail Price: 250", "250"),
        ("Retail Price: 75", "75"),
    ]

    for text, expected_mrp in test_cases:
        result = extract_product_fields(text)
        assert result.mrp == expected_mrp

def test_date_label_variations():
    test_cases = [
        ("Mfg Date: 12/05/2026", "manufacturing_date", "12/05/2026"),
        ("Date of Mfg: 10/06/2026", "manufacturing_date", "10/06/2026"),
        ("Expiry Date: 12/05/2027", "expiry_date", "12/05/2027"),
        ("Useby: 10/06/2027", "expiry_date", "10/06/2027"),
    ]

    for text, field, expected in test_cases:
        result = extract_product_fields(text)
        assert getattr(result, field) == expected


def test_batch_number_needs_review_retention_and_status():
    """Verify that ambiguous batch number 'KA 29C B' is retained with needs_review status."""
    text = "Batch No: KA 29C B"
    result = extract_product_fields(text)

    # 1. Candidate is extracted and not dropped to None
    assert result.batch_number == "KA 29C B"

    # 2. Status is preserved as 'needs_review' (not automatically promoted)
    assert get_field_status("batch_number", result.batch_number) == "needs_review"

    # 3. In candidate selection, needs_review is retained when no extracted candidate exists
    nr_fields = ExtractedProductFields(product_name=None, batch_number="KA 29C B", manufacturing_date=None, expiry_date=None)
    chosen = _choose_field("batch_number", [(nr_fields, 0.75)])
    assert chosen == "KA 29C B"

    # 4. If a valid 'extracted' candidate is available, it is preferred over 'needs_review'
    extracted_fields = ExtractedProductFields(product_name=None, batch_number="AB123", manufacturing_date=None, expiry_date=None)
    chosen_with_extracted = _choose_field("batch_number", [(nr_fields, 0.9), (extracted_fields, 0.5)])
    assert chosen_with_extracted == "AB123"


def test_net_quantity_needs_review_retention_and_status():
    """Verify that ambiguous quantity '110g + 20g EXTRA' is retained with needs_review status."""
    text = "Net Qty: 110g + 20g EXTRA"
    result = extract_product_fields(text)

    # 1. Candidate is extracted and not dropped to None
    assert result.net_quantity == "110g + 20g EXTRA"

    # 2. Status is preserved as 'needs_review'
    assert get_field_status("net_quantity", result.net_quantity) == "needs_review"

    # 3. Retained by _choose_field when no better extracted candidate exists
    nr_fields = ExtractedProductFields(product_name=None, batch_number=None, manufacturing_date=None, expiry_date=None, net_quantity="110g + 20g EXTRA")
    chosen = _choose_field("net_quantity", [(nr_fields, 0.8)])
    assert chosen == "110g + 20g EXTRA"

    # 4. Extracted candidate is preferred if present
    extracted_fields = ExtractedProductFields(product_name=None, batch_number=None, manufacturing_date=None, expiry_date=None, net_quantity="130 g")
    chosen_with_extracted = _choose_field("net_quantity", [(nr_fields, 0.9), (extracted_fields, 0.4)])
    assert chosen_with_extracted == "130 g"


def test_mfg_date_before_packed_date():
    """Verify manufacturing date is extracted when Mfg Date appears before Packed Date."""
    text = "Mfg Date: 12/05/2026\nPacked Date: 15/05/2026"
    result = extract_product_fields(text)
    assert result.manufacturing_date == "12/05/2026"
    assert get_field_status("manufacturing_date", result.manufacturing_date) == "extracted"


def test_packed_date_before_mfg_date():
    """Verify manufacturing date is extracted when Packed Date appears before Mfg Date."""
    text = "Packed Date: 15/05/2026\nMfg Date: 12/05/2026"
    result = extract_product_fields(text)
    assert result.manufacturing_date == "12/05/2026"
    assert get_field_status("manufacturing_date", result.manufacturing_date) == "extracted"


def test_only_pkd_does_not_populate_manufacturing_date():
    """Verify that Packed Date / PKD alone does NOT populate manufacturing_date."""
    test_cases = [
        "PKD: 29-7-20",
        "PKD. 29-7-20",
        "Packed Date: 15/05/2026",
        "Date of Packing: 15/05/2026",
        "Date of Pkd: 29-7-20",
    ]
    for text in test_cases:
        result = extract_product_fields(text)
        assert result.manufacturing_date is None
        assert get_field_status("manufacturing_date", result.manufacturing_date) == "not_detected"


def test_only_mfg_date_populates_manufacturing_date():
    """Verify that explicit manufacturing labels populate manufacturing_date."""
    test_cases = [
        ("Mfg Date: 29-7-20", "29-7-20"),
        ("Manufacturing Date: 12/05/2026", "12/05/2026"),
        ("Date of Manufacture: 10/06/2026", "10/06/2026"),
        ("Date of Mfg: 10/06/2026", "10/06/2026"),
        ("Mfd Date: 01/2025", "01/2025"),
    ]
    for text, expected in test_cases:
        result = extract_product_fields(text)
        assert result.manufacturing_date == expected
        assert get_field_status("manufacturing_date", result.manufacturing_date) == "extracted"


def test_existing_expiry_date_extraction():
    """Verify that expiry date is extracted from explicit expiry labels without affecting mfg date."""
    test_cases = [
        ("Expiry Date: 12/05/2027", "12/05/2027"),
        ("Expiration Date: 01/2028", "01/2028"),
        ("Date of Expiry: 15/08/2026", "15/08/2026"),
        ("Best Before: 10/2026", "10/2026"),
        ("Useby: 12/2027", "12/2027"),
    ]
    for text, expected in test_cases:
        result = extract_product_fields(text)
        assert result.expiry_date == expected
        assert result.manufacturing_date is None
        assert get_field_status("expiry_date", result.expiry_date) == "extracted"


def test_ambiguous_manufacturing_date_candidate_retained_with_needs_review():
    """Verify that ambiguous manufacturing-date candidates retain needs_review status and candidate retention."""
    text = "Mfg Date: 31/02/2025"
    result = extract_product_fields(text)
    assert result.manufacturing_date == "31/02/2025"
    assert get_field_status("manufacturing_date", result.manufacturing_date) == "needs_review"

    # Retained when no extracted candidate is present
    ambiguous_date_fields = ExtractedProductFields(
        product_name=None,
        batch_number=None,
        manufacturing_date="31/02/2025",
        expiry_date=None,
    )
    chosen = _choose_field("manufacturing_date", [(ambiguous_date_fields, 0.7)])
    assert chosen == "31/02/2025"

    # Preferred extracted candidate when present
    valid_date_fields = ExtractedProductFields(
        product_name=None,
        batch_number=None,
        manufacturing_date="29-7-20",
        expiry_date=None,
    )
    chosen_valid = _choose_field("manufacturing_date", [(ambiguous_date_fields, 0.9), (valid_date_fields, 0.5)])
    assert chosen_valid == "29-7-20"


def test_existing_correctly_extracted_values_preserved():
    """Verify that existing correctly extracted values retain 'extracted' status and behavior."""
    text = """Product Name: Parle-G
Batch No: AB-123
Net Qty: 200 g
Mfg Date: 12/05/2026
Expiry Date: 12/05/2027
MRP: Rs. 50"""

    result = extract_product_fields(text)

    assert result.product_name == "Parle-G"
    assert result.batch_number == "AB-123"
    assert result.net_quantity == "200 g"
    assert result.manufacturing_date == "12/05/2026"
    assert result.expiry_date == "12/05/2027"
    assert result.mrp == "50"

    # Ensure all valid values have 'extracted' status
    assert get_field_status("product_name", result.product_name) == "extracted"
    assert get_field_status("batch_number", result.batch_number) == "extracted"
    assert get_field_status("net_quantity", result.net_quantity) == "extracted"
    assert get_field_status("manufacturing_date", result.manufacturing_date) == "extracted"
    assert get_field_status("expiry_date", result.expiry_date) == "extracted"
    assert get_field_status("mrp", result.mrp) == "extracted"


def test_genuinely_missing_field_returns_none_and_not_detected():
    """Verify that genuinely missing fields return None and are marked 'not_detected'."""
    text = "Product Name: Paracetamol"
    result = extract_product_fields(text)

    assert result.product_name == "Paracetamol"
    assert result.batch_number is None
    assert result.manufacturing_date is None
    assert result.expiry_date is None
    assert result.net_quantity is None
    assert result.mrp is None

    # Status must be 'not_detected'
    assert get_field_status("batch_number", result.batch_number) == "not_detected"
    assert get_field_status("manufacturing_date", result.manufacturing_date) == "not_detected"
    assert get_field_status("expiry_date", result.expiry_date) == "not_detected"
    assert get_field_status("net_quantity", result.net_quantity) == "not_detected"
    assert get_field_status("mrp", result.mrp) == "not_detected"

    # _choose_field returns None when all candidates are None/empty
    empty_fields = ExtractedProductFields(product_name=None, batch_number=None, manufacturing_date=None, expiry_date=None)
    assert _choose_field("batch_number", [(empty_fields, 0.8)]) is None


def test_batch_number_multi_token_preservation():
    """Verify multi-token batch numbers are preserved and explanatory prose is rejected."""
    # Multi-token batch with trailing barcode separator
    text1 = "B.No. KA 29C B | A 901719 PKD. 29-7-20"
    res1 = extract_product_fields(text1)
    assert res1.batch_number == "KA 29C B"
    assert get_field_status("batch_number", res1.batch_number) == "needs_review"

    # Multi-token batch with spaces
    text2 = "Batch No: DAF IT A608\nUse By: 10/2026"
    res2 = extract_product_fields(text2)
    assert res2.batch_number == "DAF IT A608"

    # Explanatory prose referring to batch must be ignored
    text3 = "OF THE LAST CHARACTER OF THE BATCH INDICATES THE MANUFACTURING UNIT"
    res3 = extract_product_fields(text3)
    assert res3.batch_number is None


def test_promotional_net_quantity():
    """Verify promotional quantities and gm/gms units are recognized."""
    test_cases = [
        ("Net Weight: 110g+20g EXTRAS", "110g+20g EXTRAS", "needs_review"),
        ("Net Qty: 110g + 20g EXTRA", "110g + 20g EXTRA", "needs_review"),
        ("Net Weight: 200 gm", "200 gm", "extracted"),
        ("Net Content: 500 gms", "500 gms", "extracted"),
    ]
    for text, expected, expected_status in test_cases:
        res = extract_product_fields(text)
        assert res.net_quantity == expected
        assert get_field_status("net_quantity", res.net_quantity) == expected_status


def test_mrp_ocr_variations():
    """Verify MRP cleans OCR artifacts, symbols, decimal misreadings, and flags zero price."""
    test_cases = [
        ("*MRP®= 10.00", "10.00", "extracted"),
        ("MRP: Rs. 10.OO", "10.00", "extracted"),
        ("MRP: Rs. 150/-", "150", "extracted"),
        ("MRP ₹100", "100", "extracted"),
        ("MRP: Rs. 0.00", "0.00", "needs_review"),
    ]
    for text, expected, expected_status in test_cases:
        res = extract_product_fields(text)
        assert res.mrp == expected
        assert get_field_status("mrp", res.mrp) == expected_status


def test_standalone_manufacturer_name():
    """Verify standalone corporate entities are recognized without 'Manufactured by' prefix."""
    # Parle standalone corporate name
    text1 = "PARLE PRODUCTS PVT. LTD. North Level Crossing, Mumbai"
    res1 = extract_product_fields(text1)
    assert res1.manufacturer == "PARLE PRODUCTS PVT. LTD"
    assert get_field_status("manufacturer", res1.manufacturer) == "extracted"

    # Haldiram standalone corporate name with leading orphan noise cleaned
    text2 = "TED HALDIRAM SNACKS FOOD PRIVATE LIMITED. > EPR Regn"
    res2 = extract_product_fields(text2)
    assert res2.manufacturer == "HALDIRAM SNACKS FOOD PRIVATE LIMITED"
    assert get_field_status("manufacturer", res2.manufacturer) == "extracted"


def test_address_extraction_with_pin():
    """Verify address extraction with Indian PIN code while ignoring metadata lines."""
    text = """NET. WEIGHT: 110g+20g EXTRAS: *MRP®= 10.00 (INCL. OF ALL TAXES) B.No. KA 29C B | A 901719 PKD. 29-7-20
PARLE PRODUCTS PVT. LTD. North Level Crossing, Vile Parle East, Mumbai-400057 cs@parle.biz"""
    res = extract_product_fields(text)
    assert res.address == "North Level Crossing, Vile Parle East, Mumbai-400057"
    assert get_field_status("address", res.address) == "extracted"


def test_consumer_care_extraction():
    """Verify consumer care email, toll-free, and phone numbers are extracted."""
    text1 = "Email: cs@parle.biz or call 1800-222-333"
    res1 = extract_product_fields(text1)
    assert res1.consumer_care == "cs@parle.biz"

    text2 = "For complaints call at +91-11-47006709 or write to customer care"
    res2 = extract_product_fields(text2)
    assert res2.consumer_care == "+91-11-47006709"


def test_field_specific_confidences():
    """Verify missing fields have None confidence and present fields have genuine scores."""
    text = "Product Name: Parle-G\nMRP: Rs. 50\nBatch No: KA 29C B"
    res = extract_product_fields(text)

    # Missing fields have None confidence
    assert res.field_confidences.get("expiry_date") is None
    assert res.field_confidences.get("manufacturing_date") is None
    assert res.field_confidences.get("net_quantity") is None

    # Extracted fields have high confidence
    assert res.field_confidences.get("product_name") >= 80.0
    assert res.field_confidences.get("mrp") >= 80.0

    # needs_review fields have discounted confidence
    assert 30.0 <= res.field_confidences.get("batch_number") <= 70.0
