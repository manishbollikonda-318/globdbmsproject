import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_deck(output_path):
    prs = Presentation()
    # 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    COLOR_BG = RGBColor(255, 255, 255)
    COLOR_CARD = RGBColor(248, 250, 252)
    COLOR_DARK = RGBColor(15, 23, 42)
    COLOR_BLACK = RGBColor(0, 0, 0)
    COLOR_TEXT_MAIN = RGBColor(9, 9, 11)
    COLOR_TEXT_MUTED = RGBColor(82, 82, 91)
    COLOR_BORDER = RGBColor(228, 228, 231)
    COLOR_CODE_BG = RGBColor(24, 24, 27)
    COLOR_CODE_TEXT = RGBColor(244, 244, 245)
    COLOR_ACCENT = RGBColor(212, 175, 55)

    blank_layout = prs.slide_layouts[6]

    def add_header(slide, title_text, category_text="SQL & RDBMS ARCHITECTURE"):
        # Category Tag
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(0.4))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = COLOR_TEXT_MUTED

        # Main Slide Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.7), Inches(0.8))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.size = Pt(26)
        p_title.font.bold = True
        p_title.font.color.rgb = COLOR_TEXT_MAIN

        # Top border line
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.65), Inches(11.733), Inches(0.02))
        line.fill.solid()
        line.fill.fore_color.rgb = COLOR_BLACK
        line.line.color.rgb = COLOR_BLACK

    # ==========================================
    # SLIDE 1: Title Slide
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    
    # Outer frame accent box
    bg_box = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(1.0), Inches(10.933), Inches(5.5))
    bg_box.fill.solid()
    bg_box.fill.fore_color.rgb = COLOR_CARD
    bg_box.line.color.rgb = COLOR_BORDER
    bg_box.line.width = Pt(1.5)

    tbox = s1.shapes.add_textbox(Inches(1.8), Inches(1.6), Inches(9.733), Inches(4.2))
    tf = tbox.text_frame
    tf.word_wrap = True

    p0 = tf.paragraphs[0]
    p0.text = "DATABASE MANAGEMENT SYSTEMS • CASE STUDY"
    p0.font.size = Pt(13)
    p0.font.bold = True
    p0.font.color.rgb = COLOR_TEXT_MUTED
    p0.space_after = Pt(14)

    p1 = tf.add_paragraph()
    p1.text = "Hotel Revenue & Reservation System"
    p1.font.size = Pt(36)
    p1.font.bold = True
    p1.font.color.rgb = COLOR_TEXT_MAIN
    p1.space_after = Pt(10)

    p2 = tf.add_paragraph()
    p2.text = "Enterprise Relational Modeling, Integrity Enforcement & Advanced SQL Engine"
    p2.font.size = Pt(18)
    p2.font.color.rgb = COLOR_TEXT_MUTED
    p2.space_after = Pt(28)

    p3 = tf.add_paragraph()
    p3.text = "• Core Focus: Data Definition (DDL), Triggers, Views, Stored Procedures, UDFs & Analytical Joins\n• Implemented on: MySQL 8+ Engine • Node.js Driver • INR (₹) Currency"
    p3.font.size = Pt(14)
    p3.font.color.rgb = COLOR_TEXT_MAIN

    s1.notes_slide.notes_text_frame.text = (
        "Welcome. This presentation examines the design and implementation of a Hotel Revenue "
        "Database System. While a modern web interface powers user interaction in INR (₹), our core "
        "focus is the relational engine beneath it—exploring how advanced SQL language constructs "
        "guarantee atomicity, consistency, and automated financial reporting."
    )

    # ==========================================
    # SLIDE 2: Schema Design & DDL
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    add_header(s2, "Relational Schema Architecture & Data Definition Language (DDL)", "Slide 2: Schema Design")

    # Left Column: Architectural Details
    left_box = s2.shapes.add_textbox(Inches(0.8), Inches(1.9), Inches(5.6), Inches(5.0))
    tf_l2 = left_box.text_frame
    tf_l2.word_wrap = True

    p = tf_l2.paragraphs[0]
    p.text = "3-Entity Normalized Schema (3NF):"
    p.font.size = Pt(16)
    p.font.bold = True
    p.space_after = Pt(12)

    bullets = [
        ("rooms Table", "Primary Key (room_number INT), room_type VARCHAR(50), room_rate DECIMAL(10,2)."),
        ("reservations Table", "Primary Key (reservation_id INT), Foreign Key (room_number) referencing rooms, check-in and check-out dates, and total_cost."),
        ("payments Table", "Primary Key (payment_id INT), Foreign Key (reservation_id) referencing reservations, payment_amount, and payment_method."),
        ("Exact Monetary Typing", "DECIMAL(10,2) is chosen over FLOAT/DOUBLE to prevent catastrophic floating-point binary rounding errors in financial transactions.")
    ]
    for title, desc in bullets:
        pb = tf_l2.add_paragraph()
        pb.text = f"• {title}: {desc}"
        pb.font.size = Pt(13)
        pb.space_after = Pt(8)

    # Right Column: SQL Code Box
    cbox = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.9), Inches(5.7), Inches(5.0))
    cbox.fill.solid()
    cbox.fill.fore_color.rgb = COLOR_CODE_BG
    cbox.line.color.rgb = COLOR_CODE_BG

    ctf = cbox.text_frame
    ctf.word_wrap = True
    cp = ctf.paragraphs[0]
    cp.text = """-- Core DDL Specifications

CREATE TABLE rooms (
  room_number INT PRIMARY KEY,
  room_type VARCHAR(50),
  room_rate DECIMAL(10,2)
);

CREATE TABLE reservations (
  reservation_id INT PRIMARY KEY,
  guest_name VARCHAR(50),
  check_in_date DATE,
  check_out_date DATE,
  room_number INT,
  total_cost DECIMAL(10,2),
  FOREIGN KEY (room_number) REFERENCES rooms(room_number)
);

CREATE TABLE payments (
  payment_id INT PRIMARY KEY,
  reservation_id INT,
  payment_date DATE,
  payment_amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  FOREIGN KEY (reservation_id) 
    REFERENCES reservations(reservation_id)
);"""
    cp.font.name = "Courier New"
    cp.font.size = Pt(11)
    cp.font.color.rgb = COLOR_CODE_TEXT

    s2.notes_slide.notes_text_frame.text = (
        "We utilized strict DDL to enforce 3rd Normal Form. Using DECIMAL(10,2) guarantees monetary "
        "precision for Indian Rupee transactions, and Foreign Keys prevent orphaned reservation or payment "
        "records from ever entering the system."
    )

    # ==========================================
    # SLIDE 3: SQL Triggers
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    add_header(s3, "Defensive Database Logic: Procedural SQL Triggers", "Slide 3: Data Integrity")

    left_box3 = s3.shapes.add_textbox(Inches(0.8), Inches(1.9), Inches(5.6), Inches(5.0))
    tf_l3 = left_box3.text_frame
    tf_l3.word_wrap = True

    p = tf_l3.paragraphs[0]
    p.text = "In-Engine Defensive Safeguards:"
    p.font.size = Pt(16)
    p.font.bold = True
    p.space_after = Pt(12)

    trig_bullets = [
        ("BEFORE INSERT Trigger Architecture", "Triggers execute atomically before the write commits to the disk block, ensuring bad data never enters tables."),
        ("Trigger 1: rooms_check_rate", "Guarantees room_rate cannot be negative or zero. Raises SIGNAL SQLSTATE '45000' exception to abort invalid transactions."),
        ("Trigger 2: reservations_check_dates", "Prevents chronological inversions where check_out_date <= check_in_date, enforcing stay duration >= 1 day."),
        ("Delimiters & Context", "Uses DELIMITER // to allow compound statements within the BEGIN ... END procedural block, accessing record values via NEW.*.")
    ]
    for title, desc in trig_bullets:
        pb = tf_l3.add_paragraph()
        pb.text = f"• {title}: {desc}"
        pb.font.size = Pt(13)
        pb.space_after = Pt(8)

    cbox3 = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.9), Inches(5.7), Inches(5.0))
    cbox3.fill.solid()
    cbox3.fill.fore_color.rgb = COLOR_CODE_BG
    cbox3.line.color.rgb = COLOR_CODE_BG

    ctf3 = cbox3.text_frame
    ctf3.word_wrap = True
    cp3 = ctf3.paragraphs[0]
    cp3.text = """-- Trigger 1: Negative Rate Guard
DELIMITER //
CREATE TRIGGER rooms_check_rate
BEFORE INSERT ON rooms
FOR EACH ROW
BEGIN
    IF NEW.room_rate <= 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Room rate cannot be negative or zero';
    END IF;
END //
DELIMITER ;

-- Trigger 2: Date Sequence Guard
DELIMITER //
CREATE TRIGGER reservations_check_dates
BEFORE INSERT ON reservations
FOR EACH ROW
BEGIN
    IF NEW.check_out_date <= NEW.check_in_date THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Check-out date must be after check-in date';
    END IF;
END //
DELIMITER ;"""
    cp3.font.name = "Courier New"
    cp3.font.size = Pt(11)
    cp3.font.color.rgb = COLOR_CODE_TEXT

    s3.notes_slide.notes_text_frame.text = (
        "Rather than relying exclusively on frontend validations, our database protects itself natively. "
        "These triggers prevent financial corruption like negative room charges or checkout dates preceding check-in dates."
    )

    # ==========================================
    # SLIDE 4: Views & Virtualization
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    add_header(s4, "Virtualized Analytics & Reporting with SQL Views", "Slide 4: Views & Virtualization")

    left_box4 = s4.shapes.add_textbox(Inches(0.8), Inches(1.9), Inches(5.6), Inches(5.0))
    tf_l4 = left_box4.text_frame
    tf_l4.word_wrap = True

    p = tf_l4.paragraphs[0]
    p.text = "Why SQL Views Matter in Enterprise Architecture:"
    p.font.size = Pt(16)
    p.font.bold = True
    p.space_after = Pt(12)

    view_bullets = [
        ("Zero Storage Overhead", "Views store the query definition, not duplicated data rows. It computes dynamically upon query execution."),
        ("Encapsulation & Simplicity", "Transforms raw date conversions and aggregations into a clean, reusable interface accessible as a standard table."),
        ("Security Abstraction", "Allows business analysts and executives to query aggregate financial metrics without granting access to sensitive customer PII."),
        ("Seamless Dashboard Integration", "Frontend applications simply query SELECT * FROM monthly_revenue to build real-time monthly trend charts.")
    ]
    for title, desc in view_bullets:
        pb = tf_l4.add_paragraph()
        pb.text = f"• {title}: {desc}"
        pb.font.size = Pt(13)
        pb.space_after = Pt(8)

    cbox4 = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.9), Inches(5.7), Inches(5.0))
    cbox4.fill.solid()
    cbox4.fill.fore_color.rgb = COLOR_CODE_BG
    cbox4.line.color.rgb = COLOR_CODE_BG

    ctf4 = cbox4.text_frame
    ctf4.word_wrap = True
    cp4 = ctf4.paragraphs[0]
    cp4.text = """-- Creating the Monthly Revenue View

CREATE VIEW monthly_revenue AS
SELECT 
    DATE_FORMAT(check_in_date, '%Y-%m') AS month, 
    SUM(total_cost) AS revenue
FROM 
    reservations
GROUP BY 
    month;

-- Querying the Virtual View
SELECT * FROM monthly_revenue;

/* Sample View Output:
+---------+----------+
| month   | revenue  |
+---------+----------+
| 2026-11 | 33900.00 |
| 2026-12 | 48500.00 |
+---------+----------+
*/"""
    cp4.font.name = "Courier New"
    cp4.font.size = Pt(12)
    cp4.font.color.rgb = COLOR_CODE_TEXT

    s4.notes_slide.notes_text_frame.text = (
        "SQL Views serve as virtual tables. By encapsulating aggregation and date-formatting into "
        "monthly_revenue, downstream dashboards and managers query high-level business intelligence effortlessly."
    )

    # ==========================================
    # SLIDE 5: Stored Procedures
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    add_header(s5, "Server-Side Business Logic: Stored Procedures", "Slide 5: Stored Procedures")

    left_box5 = s5.shapes.add_textbox(Inches(0.8), Inches(1.9), Inches(5.6), Inches(5.0))
    tf_l5 = left_box5.text_frame
    tf_l5.word_wrap = True

    p = tf_l5.paragraphs[0]
    p.text = "Precompiled Engine Automation:"
    p.font.size = Pt(16)
    p.font.bold = True
    p.space_after = Pt(12)

    proc_bullets = [
        ("Precompiled Execution Plans", "Stored procedures are parsed and optimized once by the MySQL engine, minimizing query parsing latency."),
        ("Parameter Directionality", "Supports IN parameters for incoming query filters and OUT parameters to return computed results directly to session variables."),
        ("Procedure: get_room_revenue", "Joins reservations with rooms, filters by room type and date bounds, and writes total revenue directly into an output parameter."),
        ("Procedure: update_room_rate", "Safely updates prices using parameterized values, shielding tables from manual or unauthorized UPDATE statements.")
    ]
    for title, desc in proc_bullets:
        pb = tf_l5.add_paragraph()
        pb.text = f"• {title}: {desc}"
        pb.font.size = Pt(13)
        pb.space_after = Pt(8)

    cbox5 = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.9), Inches(5.7), Inches(5.0))
    cbox5.fill.solid()
    cbox5.fill.fore_color.rgb = COLOR_CODE_BG
    cbox5.line.color.rgb = COLOR_CODE_BG

    ctf5 = cbox5.text_frame
    ctf5.word_wrap = True
    cp5 = ctf5.paragraphs[0]
    cp5.text = """-- Stored Procedure: Calculate Revenue by Room Type
DELIMITER //
CREATE PROCEDURE get_room_revenue(
    IN room_type_param VARCHAR(50),
    IN start_date_param DATE,
    IN end_date_param DATE,
    OUT revenue DECIMAL(10,2)
)
BEGIN
    SELECT SUM(total_cost) INTO revenue
    FROM reservations
    JOIN rooms ON reservations.room_number = rooms.room_number
    WHERE rooms.room_type = room_type_param
      AND check_in_date >= start_date_param
      AND check_out_date <= end_date_param;
END //
DELIMITER ;

-- Executing the Stored Procedure
CALL get_room_revenue('Deluxe', '2026-11-01', '2026-11-30', @rev);
SELECT @rev AS deluxe_monthly_revenue;"""
    cp5.font.name = "Courier New"
    cp5.font.size = Pt(10.5)
    cp5.font.color.rgb = COLOR_CODE_TEXT

    s5.notes_slide.notes_text_frame.text = (
        "Stored procedures shift compute into the engine. Our procedures demonstrate both scalar output "
        "parameters (@revenue) and parameterized data modification, keeping database operations repeatable and secure."
    )

    # ==========================================
    # SLIDE 6: Functions vs Procedures
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    add_header(s6, "Deterministic Functions (UDFs) vs. Stored Procedures", "Slide 6: Functions & Procedures")

    left_box6 = s6.shapes.add_textbox(Inches(0.8), Inches(1.9), Inches(5.6), Inches(5.0))
    tf_l6 = left_box6.text_frame
    tf_l6.word_wrap = True

    p = tf_l6.paragraphs[0]
    p.text = "User-Defined Functions (UDFs):"
    p.font.size = Pt(16)
    p.font.bold = True
    p.space_after = Pt(10)

    fn_bullets = [
        ("Inline Mathematical Evaluation", "Functions must return exactly one scalar value, enabling them to be called directly in SELECT projections, WHERE clauses, and calculations."),
        ("DETERMINISTIC Characteristic", "Declaring a function DETERMINISTIC guarantees that identical input parameters always produce the exact same return value, enabling engine caching."),
        ("UDF: get_total_revenue", "Computes total revenue across custom date ranges inline: SELECT get_total_revenue('2026-11-01', '2026-11-30');"),
        ("UDF: get_average_room_rate", "Calculates real-time average rates for room types: SELECT get_average_room_rate('Executive Suite');")
    ]
    for title, desc in fn_bullets:
        pb = tf_l6.add_paragraph()
        pb.text = f"• {title}: {desc}"
        pb.font.size = Pt(12)
        pb.space_after = Pt(6)

    cbox6 = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.9), Inches(5.7), Inches(5.0))
    cbox6.fill.solid()
    cbox6.fill.fore_color.rgb = COLOR_CODE_BG
    cbox6.line.color.rgb = COLOR_CODE_BG

    ctf6 = cbox6.text_frame
    ctf6.word_wrap = True
    cp6 = ctf6.paragraphs[0]
    cp6.text = """-- Creating a Deterministic User-Defined Function
DELIMITER //
CREATE FUNCTION get_total_revenue(start_date DATE, end_date DATE)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE revenue DECIMAL(10,2);
    SELECT SUM(total_cost) INTO revenue
    FROM reservations
    WHERE check_in_date >= start_date 
      AND check_out_date <= end_date;
    RETURN IFNULL(revenue, 0.00);
END //
DELIMITER ;

-- Calling the Function Directly in SQL Expressions
SELECT 
    get_total_revenue('2026-11-01', '2026-11-30') AS nov_revenue,
    get_total_revenue('2026-12-01', '2026-12-31') AS dec_revenue;"""
    cp6.font.name = "Courier New"
    cp6.font.size = Pt(10.5)
    cp6.font.color.rgb = COLOR_CODE_TEXT

    s6.notes_slide.notes_text_frame.text = (
        "A fundamental SQL distinction: Stored procedures orchestrate workflows and mutate data, "
        "whereas User-Defined Functions evaluate deterministic formulas inline inside SELECT statements."
    )

    # ==========================================
    # SLIDE 7: Complex Joins & Queries
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    add_header(s7, "Complex Queries, Joins, Subqueries & Group Aggregations", "Slide 7: DQL Analytics")

    left_box7 = s7.shapes.add_textbox(Inches(0.8), Inches(1.9), Inches(5.6), Inches(5.0))
    tf_l7 = left_box7.text_frame
    tf_l7.word_wrap = True

    p = tf_l7.paragraphs[0]
    p.text = "Advanced Analytical Capabilities:"
    p.font.size = Pt(16)
    p.font.bold = True
    p.space_after = Pt(12)

    query_bullets = [
        ("Multi-Table Relational INNER JOINs", "Combines reservations and rooms on room_number, and reservations with payments on reservation_id to trace the full audit ledger."),
        ("Subqueries in Projection", "Computes occupancy percentages dynamically by dividing category booking counts by total system reservations in a single execution step."),
        ("Multi-Dimensional Aggregations", "Groups concurrently by MONTH(check_in_date) and room_type to expose seasonal demand shifts and revenue drivers."),
        ("Auditing Guest Transactions", "Pinpoint guest billing history instantly with indexed foreign key lookups.")
    ]
    for title, desc in query_bullets:
        pb = tf_l7.add_paragraph()
        pb.text = f"• {title}: {desc}"
        pb.font.size = Pt(13)
        pb.space_after = Pt(8)

    cbox7 = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.9), Inches(5.7), Inches(5.0))
    cbox7.fill.solid()
    cbox7.fill.fore_color.rgb = COLOR_CODE_BG
    cbox7.line.color.rgb = COLOR_CODE_BG

    ctf7 = cbox7.text_frame
    ctf7.word_wrap = True
    cp7 = ctf7.paragraphs[0]
    cp7.text = """-- 1. Occupancy Rate by Room Type (Join + Subquery)
SELECT 
    rm.room_type,
    COUNT(*) AS total_reservations,
    (COUNT(*) / (SELECT COUNT(*) FROM reservations) * 100) AS occupancy_rate
FROM reservations r
INNER JOIN rooms rm ON r.room_number = rm.room_number
GROUP BY rm.room_type;

-- 2. Monthly Revenue by Room Category (Multi-Group)
SELECT 
    DATE_FORMAT(check_in_date, '%Y-%m') AS booking_month,
    rm.room_type,
    SUM(r.total_cost) AS category_revenue
FROM reservations r
JOIN rooms rm ON r.room_number = rm.room_number
GROUP BY booking_month, rm.room_type
ORDER BY booking_month ASC, category_revenue DESC;"""
    cp7.font.name = "Courier New"
    cp7.font.size = Pt(10.5)
    cp7.font.color.rgb = COLOR_CODE_TEXT

    s7.notes_slide.notes_text_frame.text = (
        "Here SQL demonstrates its analytical power. Using subqueries within projection clauses allows us "
        "to calculate occupancy percentages across room categories in a single database roundtrip."
    )

    # ==========================================
    # SLIDE 8: Full-Stack Integration & Conclusion
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    add_header(s8, "Transactional Safety, Cascade Deletions & Live Production", "Slide 8: System Delivery")

    left_box8 = s8.shapes.add_textbox(Inches(0.8), Inches(1.9), Inches(5.6), Inches(5.0))
    tf_l8 = left_box8.text_frame
    tf_l8.word_wrap = True

    p = tf_l8.paragraphs[0]
    p.text = "Engineering Reliability & Production Architecture:"
    p.font.size = Pt(16)
    p.font.bold = True
    p.space_after = Pt(12)

    sys_bullets = [
        ("Atomic Cascade Deletion", "Implemented transactional deletion (START TRANSACTION ... COMMIT) ensuring deleting a room cleans up orphaned reservations and payments seamlessly."),
        ("SQL Injection Neutralization", "All application endpoints use Node.js mysql2 parameterized bindings (?, ?, ?), treating all inputs as literal values, completely neutralizing SQLi."),
        ("Currency Standardization in INR", "All calculations, receipts, and KPIs are localized to Indian Rupee (₹ INR) with standard banking rounding rules."),
        ("Dual-Layer Live Hosting", "• Localhost Dashboard: Node.js Express + Native MySQL service\n• Cloud Edition: GitHub Pages with browser storage fallback.")
    ]
    for title, desc in sys_bullets:
        pb = tf_l8.add_paragraph()
        pb.text = f"• {title}: {desc}"
        pb.font.size = Pt(12.5)
        pb.space_after = Pt(8)

    cbox8 = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.9), Inches(5.7), Inches(5.0))
    cbox8.fill.solid()
    cbox8.fill.fore_color.rgb = COLOR_CARD
    cbox8.line.color.rgb = COLOR_BORDER

    ctf8 = cbox8.text_frame
    ctf8.word_wrap = True
    cp8 = ctf8.paragraphs[0]
    cp8.text = "PROJECT METRICS & SUMMARY"
    cp8.font.size = Pt(14)
    cp8.font.bold = True
    cp8.font.color.rgb = COLOR_TEXT_MAIN
    cp8.space_after = Pt(12)

    summary_items = [
        ("Relational Engine", "MySQL 8.0+ Enterprise"),
        ("SQL Features Demonstrated", "DDL, Triggers, Views, Procedures, UDFs, Joins, Subqueries"),
        ("Data Normalization", "Third Normal Form (3NF)"),
        ("Currency Standard", "Indian Rupee (₹ INR)"),
        ("Live Web Dashboard", "manishbollikonda-318.github.io/globdbmsproject/"),
        ("Localhost Port", "http://localhost:3000")
    ]
    for label, val in summary_items:
        p_item = ctf8.add_paragraph()
        p_item.text = f"{label}: {val}"
        p_item.font.size = Pt(12)
        p_item.font.color.rgb = COLOR_TEXT_MUTED
        p_item.space_after = Pt(6)

    s8.notes_slide.notes_text_frame.text = (
        "To conclude: from DDL schemas and triggers to stored routines and complex joins, this project demonstrates "
        "how strict relational design guarantees business integrity. Thank you."
    )

    prs.save(output_path)
    print(f"Presentation saved successfully to {output_path}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "Hotel_Revenue_SQL_Project_Presentation.pptx"
    create_deck(out_file)
