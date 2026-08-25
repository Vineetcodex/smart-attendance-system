import os
import subprocess

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Smart AI Biometric Attendance System - Complete Guide & Architecture</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  @page {
    size: A4;
    margin: 14mm 14mm 16mm 14mm;
    @bottom-right {
      content: counter(page);
    }
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.55;
    font-size: 10.5pt;
  }

  .page-break {
    page-break-before: always;
  }

  .avoid-break {
    page-break-inside: avoid;
  }

  /* Cover Page */
  .cover {
    min-height: 92vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 30px 20px;
    border-bottom: 2px solid #e2e8f0;
  }

  .cover-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .badge-emerald {
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
  }

  .badge-blue {
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }

  .badge-purple {
    background: #faf5ff;
    color: #7e22ce;
    border: 1px solid #e9d5ff;
  }

  .badge-amber {
    background: #fffbeb;
    color: #d97706;
    border: 1px solid #fde68a;
  }

  .cover-title {
    font-size: 28pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
    margin-top: 40px;
    letter-spacing: -0.02em;
  }

  .cover-subtitle {
    font-size: 13pt;
    color: #475569;
    margin-top: 15px;
    line-height: 1.5;
    max-width: 90%;
  }

  .cover-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-top: 40px;
  }

  .cover-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
  }

  .cover-card h4 {
    font-size: 10pt;
    color: #0f172a;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .cover-card p {
    font-size: 8.5pt;
    color: #64748b;
    line-height: 1.4;
  }

  .cover-footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8.5pt;
    color: #64748b;
  }

  /* Section Styling */
  h1 {
    font-size: 18pt;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 12px;
    letter-spacing: -0.02em;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  h2 {
    font-size: 13.5pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 20px;
    margin-bottom: 8px;
    letter-spacing: -0.01em;
  }

  h3 {
    font-size: 11pt;
    font-weight: 700;
    color: #334155;
    margin-top: 14px;
    margin-bottom: 6px;
  }

  p {
    margin-bottom: 10px;
    color: #334155;
  }

  .lead {
    font-size: 11pt;
    color: #1e293b;
    font-weight: 500;
    margin-bottom: 14px;
  }

  /* Analogies & Callout Boxes */
  .callout {
    border-radius: 10px;
    padding: 12px 14px;
    margin: 12px 0;
    font-size: 9.5pt;
    line-height: 1.5;
  }

  .callout-analogy {
    background: #f0fdf4;
    border-left: 4px solid #10b981;
    color: #065f46;
  }

  .callout-analogy strong {
    color: #047857;
    display: block;
    margin-bottom: 3px;
    font-size: 10pt;
  }

  .callout-info {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    color: #1e40af;
  }

  .callout-info strong {
    color: #1d4ed8;
    display: block;
    margin-bottom: 3px;
  }

  .callout-warning {
    background: #fffbeb;
    border-left: 4px solid #f59e0b;
    color: #92400e;
  }

  /* Grid Layouts */
  .grid-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin: 12px 0;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin: 12px 0;
  }

  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .card h4 {
    font-size: 10pt;
    font-weight: 700;
    color: #0f172a;
  }

  .card p {
    font-size: 8.5pt;
    color: #475569;
    margin-bottom: 0;
    line-height: 1.45;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 8.5pt;
  }

  th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 8px 10px;
  }

  th:first-child {
    border-top-left-radius: 6px;
  }

  th:last-child {
    border-top-right-radius: 6px;
  }

  td {
    padding: 7px 10px;
    border-bottom: 1px solid #e2e8f0;
    color: #334155;
    vertical-align: top;
  }

  tr:nth-child(even) td {
    background: #f8fafc;
  }

  /* Code & Math */
  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8pt;
    background: #f1f5f9;
    padding: 2px 5px;
    border-radius: 4px;
    color: #0f172a;
    border: 1px solid #e2e8f0;
  }

  .math-box {
    background: #0f172a;
    color: #f8fafc;
    border-radius: 8px;
    padding: 10px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5pt;
    margin: 10px 0;
    line-height: 1.5;
  }

  .math-box span.comment {
    color: #94a3b8;
  }

  .math-box span.highlight {
    color: #34d399;
    font-weight: bold;
  }

  /* Step Flow Indicator */
  .step-list {
    margin: 10px 0;
    padding-left: 0;
    list-style: none;
  }

  .step-item {
    position: relative;
    padding-left: 32px;
    margin-bottom: 12px;
  }

  .step-number {
    position: absolute;
    left: 0;
    top: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #059669;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8pt;
    font-weight: 700;
  }

  .step-title {
    font-weight: 700;
    font-size: 9.5pt;
    color: #0f172a;
    margin-bottom: 2px;
  }

  .step-desc {
    font-size: 8.5pt;
    color: #475569;
    line-height: 1.4;
  }

  .header-tag {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #059669;
    margin-bottom: 4px;
  }
</style>
</head>
<body>

<!-- ========================================================================= -->
<!-- COVER PAGE                                                                -->
<!-- ========================================================================= -->
<div class="cover">
  <div>
    <div class="cover-header">
      <span class="badge badge-emerald">Technical Blueprint & Concept Guide</span>
      <span class="badge badge-blue">Production Ready</span>
      <span class="badge badge-purple">AI / ML / Web / Mobile</span>
    </div>

    <h1 class="cover-title">
      Smart AI Biometric<br>Attendance System
    </h1>

    <p class="cover-subtitle">
      A Comprehensive, Layman-to-Expert Architectural Guide on Touchless Verification, Deep Learning Face Recognition, Geofencing, Dynamic Security, and System Workflows.
    </p>

    <div class="cover-grid">
      <div class="cover-card">
        <h4>🎯 Core Objective</h4>
        <p>100% elimination of proxy attendance, buddy punching, and manual attendance overhead using triple-factor verification in under 0.5 seconds.</p>
      </div>

      <div class="cover-card">
        <h4>🤖 Deep Learning Models</h4>
        <p>SCRFD for ultra-fast face detection, 5-landmark affine alignment, MobileFaceNet & ArcFace for 512-D embeddings, and anti-spoofing liveness.</p>
      </div>

      <div class="cover-card">
        <h4>🛡️ Triple-Factor Security</h4>
        <p>Haversine GPS Geofencing (50m radius) + Dynamic Time-Salted Office Wall QR (HMAC-SHA256) + 3-Pose Facial Biometric Match (Cosine Sim &ge; 0.70).</p>
      </div>

      <div class="cover-card">
        <h4>⚡ Unified Platform</h4>
        <p>Web Admin Command Center (React 18 + SSE Live Stream), Mobile App (Flutter APK + Web PWA), and Cloud-Ready Dual Database Engine (Supabase + Local).</p>
      </div>
    </div>
  </div>

  <div class="cover-footer">
    <div><strong>Project:</strong> Smart Attendance System (DRP Tech HQ)</div>
    <div><strong>Version:</strong> 2.4.0 (Enterprise)</div>
    <div><strong>Author:</strong> Lead Systems & AI Engineering Team</div>
  </div>
</div>

<!-- ========================================================================= -->
<!-- PAGE 1: EXECUTIVE SUMMARY & LAYMAN ANALOGY                               -->
<!-- ========================================================================= -->
<div class="page-break"></div>

<div class="header-tag">Chapter 1 • Foundation</div>
<h1>Executive Overview & Layman Analogy</h1>

<p class="lead">
  Traditional attendance systems (paper registers, ID card swipes, and physical fingerprint scanners) suffer from three major vulnerabilities: buddy punching (punching in for friends), long physical queues causing delays, and hygiene/hardware maintenance issues. This system solves all three through <strong>instant touchless mobile verification</strong>.
</p>

<div class="callout callout-analogy">
  <strong>💡 The Layman Analogy: The "Smart Digital Gatekeeper"</strong>
  Imagine a super-intelligent security guard standing at your office entrance with a stopwatch, a laser tape measure, and photographic memory:
  <ul style="margin-top: 6px; margin-left: 18px; line-height: 1.45;">
    <li><strong>First:</strong> He checks if your feet are actually standing inside the office building (GPS Geofence). You cannot punch in from your bed.</li>
    <li><strong>Second:</strong> He makes sure you are physically looking at the official poster on the office wall that changes its secret passcode every 60 seconds (Dynamic Master QR). You cannot photograph the QR and share it with friends on WhatsApp.</li>
    <li><strong>Third:</strong> He looks at your face for 0.4 seconds, measures 512 unique facial geometric distances, confirms you are a real 3D living person (not a photo or screen recording), and matches you against your approved baseline.</li>
    <li><strong>Result:</strong> Your attendance is recorded, and the CEO/HR screen in the main office updates live in milliseconds!</li>
  </ul>
</div>

<h2>The Three High-Level Stakeholders</h2>
<div class="grid-3">
  <div class="card">
    <div class="card-header">
      <h4>📱 1. Employee</h4>
      <span class="badge badge-blue">Mobile / Web</span>
    </div>
    <p>Self-registers in 10 seconds with a 3-pose face scan. Arrives at office, scans wall QR, touches nothing, and marks entry & departure with live work-duration calculation.</p>
  </div>

  <div class="card">
    <div class="card-header">
      <h4>🛡️ 2. Admin & HR</h4>
      <span class="badge badge-emerald">Web Portal</span>
    </div>
    <p>Reviews registration requests in a dedicated approval queue, views real-time entry/departure live stream via Server-Sent Events, and exports detailed attendance reports.</p>
  </div>

  <div class="card">
    <div class="card-header">
      <h4>⚡ 3. AI & Backend</h4>
      <span class="badge badge-purple">Server Engine</span>
    </div>
    <p>Orchestrates 512-D vector matching, validates cryptographic tokens, computes geofence distances, and synchronizes data across cloud and local storage.</p>
  </div>
</div>

<h2>High-Level System Architecture Diagram</h2>
<div style="background: #0f172a; border-radius: 10px; padding: 14px; margin: 12px 0; color: #f8fafc; font-size: 8.5pt; font-family: 'JetBrains Mono', monospace; line-height: 1.45;">
  <span style="color: #38bdf8;">[ Employee Mobile App / PWA ]</span><br>
  &nbsp;&nbsp;│── GPS Coordinates (Lat, Lng)<br>
  &nbsp;&nbsp;│── Wall QR Token (HMAC-SHA256 Payload)<br>
  &nbsp;&nbsp;└── Live Camera Feed (Canvas / WebRTC MediaStream)<br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│<br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼<br>
  <span style="color: #34d399;">[ Edge Client AI Pipeline (TF.js / ONNX) ]</span><br>
  &nbsp;&nbsp;│── Step 1: SCRFD Face Detection & Bounding Box<br>
  &nbsp;&nbsp;│── Step 2: 5-Landmark Affine Alignment (Canonical Pose)<br>
  &nbsp;&nbsp;│── Step 3: Anti-Spoofing & Liveness Filter<br>
  &nbsp;&nbsp;└── Step 4: ArcFace / MobileFaceNet 512-D Vector Extraction<br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│<br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼ (HTTPS REST API / Authorization Header)<br>
  <span style="color: #fbbf24;">[ Express.js Backend Server (Port 5000 / Cloud) ]</span><br>
  &nbsp;&nbsp;│── 1. Geofence Validator (Haversine Formula &le; 50m)<br>
  &nbsp;&nbsp;│── 2. Master QR Cryptographic Verifier (Timestamp &le; 60s)<br>
  &nbsp;&nbsp;│── 3. Cosine Similarity Matcher (Vector Score &ge; 0.70)<br>
  &nbsp;&nbsp;└── 4. Account Approval Enforcer (isApproved === true)<br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├──► <span style="color: #a855f7;">[ Dual Database: Supabase PostgreSQL + Local JSON ]</span><br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└──► <span style="color: #f43f5e;">[ SSE Event Stream ]</span> ──► <span style="color: #38bdf8;">[ Admin Live Dashboard (React 18) ]</span>
</div>

<!-- ========================================================================= -->
<!-- PAGE 2: TRIPLE-FACTOR VERIFICATION SHIELD                                -->
<!-- ========================================================================= -->
<div class="page-break"></div>

<div class="header-tag">Chapter 2 • Security Framework</div>
<h1>The Triple-Factor Verification Shield</h1>

<p class="lead">
  To guarantee zero fraudulent punches, attendance is validated against three independent, mathematically rigorous pillars. All three must pass simultaneously for a check-in or check-out to succeed.
</p>

<div class="card" style="margin-bottom: 12px; border-left: 4px solid #3b82f6;">
  <div class="card-header">
    <h4>📍 Pillar 1: Location Proof (GPS Geofencing & Haversine Formula)</h4>
    <span class="badge badge-blue">Math: Great-Circle Distance</span>
  </div>
  <p>
    <strong>Concept:</strong> Defines a virtual circular fence around the office coordinates (e.g., Latitude <code>18.9220° N</code>, Longitude <code>72.8347° E</code>) with a default radius of <strong>50 meters</strong>. When an employee punches, their device GPS coordinates are measured against the office center.
  </p>
  <div class="math-box">
    <span class="comment">// Haversine Formula for distance on a spherical earth</span><br>
    a = sin²(Δφ / 2) + cos(φ₁) ⋅ cos(φ₂) ⋅ sin²(Δλ / 2)<br>
    c = 2 ⋅ atan2(√a, √(1 − a))<br>
    <span class="highlight">Distance (d) = R ⋅ c</span> &nbsp;<span class="comment">(Where R = 6,371,000 meters)</span><br>
    <span class="comment">// Result Rule: If d &le; 50m ➔ PASS; If d &gt; 50m ➔ REJECT ("Outside Office")</span>
  </div>
</div>

<div class="card" style="margin-bottom: 12px; border-left: 4px solid #f59e0b;">
  <div class="card-header">
    <h4>🖼️ Pillar 2: Physical Office Presence (Dynamic Office Wall QR)</h4>
    <span class="badge badge-amber">Crypto: HMAC-SHA256 Token</span>
  </div>
  <p>
    <strong>Concept:</strong> A physical poster or digital tablet displayed on the office wall. It contains a cryptographically encrypted JSON payload combining the organization code, office secret key, and a rotating timestamp.
  </p>
  <div class="math-box">
    <span class="comment">// Dynamic Master QR Payload Structure</span><br>
    Payload = {<br>
    &nbsp;&nbsp;orgCode: "DRP-TECH-HQ",<br>
    &nbsp;&nbsp;timestamp: 1724589000, &nbsp;<span class="comment">// Current Unix epoch</span><br>
    &nbsp;&nbsp;hash: HMAC_SHA256("DRP-TECH-HQ:1724589000", SECRET_KEY)<br>
    }<br>
    <span class="highlight">Validity Window: Current Time - Timestamp &le; 60 Seconds</span>
  </div>
  <p style="font-size: 8.5pt; color: #475569; margin-top: 4px;">
    <strong>Anti-Proxy Protection:</strong> If an employee takes a photo of the QR code and texts it to an absent colleague, the token expires in 60 seconds, rendering photos useless.
  </p>
</div>

<div class="card" style="margin-bottom: 12px; border-left: 4px solid #10b981;">
  <div class="card-header">
    <h4>👤 Pillar 3: Biometric Identity (512-D Deep Learning Face ID)</h4>
    <span class="badge badge-emerald">AI: ArcFace Embeddings</span>
  </div>
  <p>
    <strong>Concept:</strong> Touchless, real-time facial feature extraction and cosine angle comparison. It compares the live face against the employee's approved 3-pose baseline (captured during enrollment) to produce an exact mathematical similarity score.
  </p>
  <div class="math-box">
    <span class="comment">// Cosine Similarity between live vector (A) and baseline vector (B)</span><br>
    <span class="highlight">Cosine Similarity = (A ⋅ B) / ( ‖A‖ ⋅ ‖B‖ )</span><br>
    Match Rule: If Score &ge; 0.70 (70%) ➔ VERIFIED & GRANTED<br>
    Match Rule: If Score &lt; 0.70 ➔ REJECTED ("Face Not Recognized")
  </div>
</div>

<!-- ========================================================================= -->
<!-- PAGE 3: COMPLETE AI & MACHINE LEARNING PIPELINE                           -->
<!-- ========================================================================= -->
<div class="page-break"></div>

<div class="header-tag">Chapter 3 • Artificial Intelligence</div>
<h1>Deep Dive into the AI & Machine Learning Pipeline</h1>

<p class="lead">
  How does the camera convert light pixels into an unbreakable digital identity in under 400 milliseconds? Here is the step-by-step breakdown of every model and mathematical transformation used.
</p>

<div class="step-list">
  <div class="step-item">
    <div class="step-number">1</div>
    <div class="step-title">Model 1: SCRFD (Sample and Computation Redistribution for Efficient Face Detection)</div>
    <div class="step-desc">
      <strong>Layman Explanation:</strong> The "Eye of the AI". It scans the raw video frames and immediately spots where human faces are located, even in low office lighting, head turns, or varying distances.<br>
      <strong>Technical Architecture:</strong> Ultra-lightweight anchor-based Convolutional Neural Network (CNN) optimized for Mobile WebAssembly and ONNX Runtime. Detects bounding boxes <code>(x, y, width, height)</code> with confidence score &ge; 0.85 in just <strong>18ms</strong>.
    </div>
  </div>

  <div class="step-item">
    <div class="step-number">2</div>
    <div class="step-title">Model 2: 5-Point Landmark Affine Transformation (Pose Canonicalization)</div>
    <div class="step-desc">
      <strong>Layman Explanation:</strong> "The Digital Head Straightener". If an employee tilts their head sideways or leans forward, comparing the photo directly would fail. This algorithm rotates and scales the face so it is perfectly upright.<br>
      <strong>Technical Details:</strong> Identifies 5 key anatomical landmarks: <code>Left Eye</code>, <code>Right Eye</code>, <code>Nose Tip</code>, <code>Left Mouth Corner</code>, and <code>Right Mouth Corner</code>. Applies a 2D Affine Transformation matrix:
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 8pt; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; margin: 4px 0;">
        [x', y']ᵀ = [ [s⋅cos(θ), -s⋅sin(θ)], [s⋅sin(θ), s⋅cos(θ)] ] ⋅ [x, y]ᵀ + [tx, ty]ᵀ
      </div>
      Crops and aligns the face to a canonical <strong>112 &times; 112 pixel</strong> standardized input canvas.
    </div>
  </div>

  <div class="step-item">
    <div class="step-number">3</div>
    <div class="step-title">Model 3: MiniVision Silent-Face Anti-Spoofing (Liveness Detection)</div>
    <div class="step-desc">
      <strong>Layman Explanation:</strong> "The Fake Photo Detector". Ensures someone is not holding up an iPad screen, a smartphone photo, or a printed paper cutout of the employee.<br>
      <strong>Technical Details:</strong> Dual-stream MobileNetV3 model analyzing Fourier frequency spectrums, color distortion moiré patterns, reflection gradients, and natural micro-texture variations of real human skin.
    </div>
  </div>

  <div class="step-item">
    <div class="step-number">4</div>
    <div class="step-title">Model 4: ArcFace (Additive Angular Margin Loss) / MobileFaceNet</div>
    <div class="step-desc">
      <strong>Layman Explanation:</strong> "The Facial DNA Generator". Converts the aligned face image into a compact mathematical signature consisting of 512 numbers.<br>
      <strong>Technical Details:</strong> Deep Residual Network that projects face features onto a 512-dimensional hypersphere where intra-class distance (same person) is minimized and inter-class distance (different people) is maximized using geodesic angular margin penalty (m = 0.5):
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 8pt; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; margin: 4px 0;">
        L_ArcFace = -ln( e^(s⋅cos(θ_y + m)) / ( e^(s⋅cos(θ_y + m)) + ∑_(j≠y) e^(s⋅cos(θ_j)) ) )
      </div>
      Output: <code>Float32Array[512]</code> normalized vector with unit length (‖V‖ = 1.0).
    </div>
  </div>

  <div class="step-item">
    <div class="step-number">5</div>
    <div class="step-title">Algorithm 5: 3-Pose Multi-Template Cosine Similarity Verification</div>
    <div class="step-desc">
      <strong>Layman Explanation:</strong> During registration, the employee records 3 poses (Center, Slight Left, Slight Right). When marking attendance, the live face vector is compared against all 3 templates. The highest similarity score is picked. If &ge; 70%, match is confirmed!
    </div>
  </div>
</div>

<!-- ========================================================================= -->
<!-- PAGE 4: COMPLETE PROJECT FLOWS & USER JOURNEYS                            -->
<!-- ========================================================================= -->
<div class="page-break"></div>

<div class="header-tag">Chapter 4 • System Workflows</div>
<h1>End-to-End System Workflows & User Journeys</h1>

<h2>Flow 1: New Employee Registration & Approval Workflow</h2>
<div class="callout callout-info">
  <strong>How self-registration and admin control work seamlessly:</strong>
</div>

<ol style="margin-left: 20px; font-size: 9pt; line-height: 1.6; color: #334155;">
  <li><strong>Employee opens portal / app:</strong> Enters Full Name, Email, Password, Department, and Assigned Shift.</li>
  <li><strong>3-Pose Biometric Enrollment:</strong> App camera prompts employee to look Center, tilt Left, and tilt Right. System captures high-quality frames and computes three 512-D embedding vectors.</li>
  <li><strong>Initial State:</strong> Account created with <code>isApproved: false</code> and <code>approvalStatus: 'PENDING'</code>.</li>
  <li><strong>Holding Screen:</strong> The employee sees: <em>"You have successfully registered! Now wait for admin approval."</em> Login and attendance punching are strictly locked.</li>
  <li><strong>Admin Review:</strong> Admin opens <strong>Registration Approvals</strong> (<code>/admin/approvals</code>), reviews candidate photo and Face ID status, and clicks <strong>"Approve & Grant Access"</strong>.</li>
  <li><strong>Instant Unlock:</strong> The employee's screen auto-polls every 8s (or on click), detects approval, and transitions automatically to the active attendance dashboard!</li>
</ol>

<h2>Flow 2: Daily Touchless Attendance (Punch In & Punch Out)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Step</th>
      <th style="width: 40%;">What the Employee Experiences</th>
      <th style="width: 35%;">What Happens Behind the Scenes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1. Geofence Check</strong></td>
      <td>Employee taps "Mark Attendance" inside office.</td>
      <td>Browser/App queries GPS hardware; verifies distance &le; 50m via Haversine formula.</td>
    </tr>
    <tr>
      <td><strong>2. Wall QR Scan</strong></td>
      <td>Points camera at office QR poster for 0.2 seconds.</td>
      <td>Decodes payload, verifies cryptographic HMAC signature & confirms timestamp &le; 60s.</td>
    </tr>
    <tr>
      <td><strong>3. Face ID AI</strong></td>
      <td>Face matches on-screen oval guide; green halo glows.</td>
      <td>SCRFD detects face &rarr; 5-landmark alignment &rarr; ArcFace extracts 512-D &rarr; Cosine match &ge; 0.70.</td>
    </tr>
    <tr>
      <td><strong>4. Punch Success</strong></td>
      <td>"Check-In Successful" chime with green checkmark.</td>
      <td>Backend logs punch, updates Supabase/local DB, and emits Server-Sent Event to Admin Live Dashboard.</td>
    </tr>
    <tr>
      <td><strong>5. Evening Departure</strong></td>
      <td>At end of workday, employee taps "Check Out" & scans.</td>
      <td>System calculates total minutes worked (e.g. 8 hrs 42 mins) and displays live departure toast in Admin portal.</td>
    </tr>
  </tbody>
</table>

<h2>Flow 3: Admin Real-Time Operations & Reporting</h2>
<div class="grid-2">
  <div class="card">
    <div class="card-header">
      <h4>📡 Live Biometric Dashboard</h4>
      <span class="badge badge-emerald">SSE Stream</span>
    </div>
    <p>Zero-refresh live stream of employee arrivals and departures. Automatically pops up green entry banners and purple departure summaries with exact work hours.</p>
  </div>

  <div class="card">
    <div class="card-header">
      <h4>📊 Attendance Reports & Export</h4>
      <span class="badge badge-blue">Excel / CSV / PDF</span>
    </div>
    <p>Comprehensive date-range and department filters. Tracks On-Time arrivals, Late marks, Overtime, and Early departures with instant CSV spreadsheet generation.</p>
  </div>
</div>

<!-- ========================================================================= -->
<!-- PAGE 5: TECHNOLOGY STACK & MODEL REFERENCE MATRIX                         -->
<!-- ========================================================================= -->
<div class="page-break"></div>

<div class="header-tag">Chapter 5 • Technology Stack</div>
<h1>Complete Technology Stack & Reference Matrix</h1>

<h2>Comprehensive Technology Matrix</h2>
<table>
  <thead>
    <tr>
      <th>Layer / Component</th>
      <th>Technology / Library</th>
      <th>Exact Role & Responsibility</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Face Detection</strong></td>
      <td><code>SCRFD / Blazeface</code></td>
      <td>Real-time bounding box localization + 5 facial landmarks in 18ms.</td>
    </tr>
    <tr>
      <td><strong>Facial Alignment</strong></td>
      <td><code>Affine Transformation Matrix</code></td>
      <td>Canonicalizes tilted/angled faces to a standard 112&times;112 frame.</td>
    </tr>
    <tr>
      <td><strong>Feature Extraction</strong></td>
      <td><code>ArcFace / MobileFaceNet</code></td>
      <td>Projects face features onto a 512-D hypersphere vector.</td>
    </tr>
    <tr>
      <td><strong>Biometric Matching</strong></td>
      <td><code>Cosine Similarity Metric</code></td>
      <td>Calculates dot-product angular distance between vectors (&ge; 0.70).</td>
    </tr>
    <tr>
      <td><strong>Liveness / Anti-Spoofing</strong></td>
      <td><code>MiniVision MobileNetV3</code></td>
      <td>Distinguishes live human skin from photos, screens, and cutouts.</td>
    </tr>
    <tr>
      <td><strong>Geofence Math</strong></td>
      <td><code>Haversine Distance Algorithm</code></td>
      <td>Calculates great-circle distance from device GPS to office center (&le; 50m).</td>
    </tr>
    <tr>
      <td><strong>QR Cryptography</strong></td>
      <td><code>CryptoJS / HMAC-SHA256</code></td>
      <td>Signs dynamic 60-second time-salted master QR payloads.</td>
    </tr>
    <tr>
      <td><strong>Frontend Admin Web</strong></td>
      <td><code>React 18 + Vite + TypeScript</code></td>
      <td>Ultra-responsive command center, approvals portal, and reports.</td>
    </tr>
    <tr>
      <td><strong>Real-Time Updates</strong></td>
      <td><code>Server-Sent Events (SSE)</code></td>
      <td>Low-latency push notifications for live entry/departure stream.</td>
    </tr>
    <tr>
      <td><strong>Mobile Applications</strong></td>
      <td><code>Flutter (Dart) + Web PWA</code></td>
      <td>Cross-platform native mobile app for Android (APK) and iOS.</td>
    </tr>
    <tr>
      <td><strong>Backend API</strong></td>
      <td><code>Node.js + Express + TypeScript</code></td>
      <td>RESTful routing, JWT authorization, and biometric verification.</td>
    </tr>
    <tr>
      <td><strong>Cloud Database</strong></td>
      <td><code>Supabase (PostgreSQL)</code></td>
      <td>Cloud persistence for organizations, staff profiles, and punch logs.</td>
    </tr>
    <tr>
      <td><strong>Offline Database</strong></td>
      <td><code>Atomic JSON File Persistence</code></td>
      <td>Zero-dependency fallback engine ensuring 100% offline continuity.</td>
    </tr>
  </tbody>
</table>

<h2>Summary of Key Architectural Highlights</h2>
<div class="grid-2">
  <div class="card">
    <h4>🔒 Security & Anti-Fraud</h4>
    <p>Triple-Factor Verification ensures attendance cannot be faked via remote GPS spoofing, photo sharing, or proxy buddy punching.</p>
  </div>
  <div class="card">
    <h4>⚡ Extreme Performance</h4>
    <p>Face detection and vector extraction execute client-side in under 400ms, minimizing server bandwidth and cloud compute costs.</p>
  </div>
  <div class="card">
    <h4>🌐 Hybrid Cloud & Offline Resilience</h4>
    <p>Automatic seamless switching between Supabase Cloud and local disk database guarantees zero downtime even if Internet disconnects.</p>
  </div>
  <div class="card">
    <h4>📱 Universal Device Support</h4>
    <p>Runs as an Android APK, iOS app, mobile responsive web app, and full-screen desktop management dashboard.</p>
  </div>
</div>

<div style="margin-top: 25px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; text-align: center; font-size: 8.5pt; color: #64748b;">
  <strong>Smart AI Biometric Attendance System</strong> • Designed & Engineered with Deep Learning, WebRTC, and Cryptographic Security.<br>
  All Rights Reserved &copy; 2026 DRP Tech HQ.
</div>

</body>
</html>
"""

html_path = os.path.abspath("Smart_Attendance_System_Complete_Guide.html")
pdf_path = os.path.abspath("Smart_Attendance_System_Complete_Guide.pdf")

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML generated at: {html_path}")

# Execute Edge / Chrome headless print to PDF
edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

browser_exe = edge_path if os.path.exists(edge_path) else chrome_path

cmd = [
    browser_exe,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={pdf_path}",
    f"file:///{html_path.replace(os.sep, '/')}"
]

print(f"Running command: {' '.join(cmd)}")
result = subprocess.run(cmd, capture_output=True, text=True)

if os.path.exists(pdf_path):
    size_kb = os.path.getsize(pdf_path) / 1024
    print(f"SUCCESS: PDF generated successfully at: {pdf_path} ({size_kb:.2f} KB)")
else:
    print(f"ERROR: PDF generation failed. Stderr: {result.stderr}")
