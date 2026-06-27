# -*- coding: utf-8 -*-
"""
SHIELD AI - Video Generator
Generates SHIELD_AI_ET_AI_HACKATHON_DEMO.mp4
Resolution: 1920x1080 | 30fps | MP4 | Voice + Music + Subtitles
"""

import os, sys, io, math, textwrap, subprocess, shutil
from pathlib import Path

# Force UTF-8 on Windows console
if sys.platform == "win32":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except Exception:
        pass

# ── AUTO INSTALL DEPENDENCIES ─────────────────────────────────────────────────
def pip_install(pkg):
    subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q",
                           "--disable-pip-version-check"],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

PACKAGES = {"Pillow": "PIL", "gTTS": "gtts", "numpy": "numpy", "moviepy": "moviepy"}
for pkg, imp in PACKAGES.items():
    try:
        __import__(imp)
        print(f"[OK] {pkg} already installed")
    except ImportError:
        print(f"[..] Installing {pkg}...")
        pip_install(pkg)
        print(f"[OK] {pkg} installed")

from PIL import Image, ImageDraw, ImageFont
from gtts import gTTS
import numpy as np

# moviepy compat (v1 and v2)
try:
    from moviepy.editor import (ImageClip, AudioFileClip, concatenate_videoclips,
                                 CompositeAudioClip, AudioArrayClip)
    MOPY2 = False
except ImportError:
    from moviepy import (ImageClip, AudioFileClip, concatenate_videoclips,
                          CompositeAudioClip, AudioArrayClip)
    MOPY2 = True

# Detect v2 by checking method names
try:
    import moviepy
    _mv = tuple(int(x) for x in moviepy.__version__.split(".")[:2])
    MOPY2 = _mv[0] >= 2
except Exception:
    MOPY2 = False

def _dur(clip, d):
    return clip.with_duration(d) if MOPY2 else clip.set_duration(d)
def _fps(clip, f):
    return clip.with_fps(f) if MOPY2 else clip.set_fps(f)
def _audio(clip, a):
    return clip.with_audio(a) if MOPY2 else clip.set_audio(a)
def _vol(clip, v):
    return clip.with_volume_scaled(v) if MOPY2 else clip.volumex(v)

# ── CONFIG ────────────────────────────────────────────────────────────────────
W, H    = 1920, 1080
FPS     = 30
OUT     = "SHIELD_AI_ET_AI_HACKATHON_DEMO.mp4"
TMPDIR  = Path("_vid_tmp")
TMPDIR.mkdir(exist_ok=True)

# ── COLORS ────────────────────────────────────────────────────────────────────
NAVY   = (2,   8,  23)
NAVY2  = (4,  14,  32)
BLUE   = (30, 144, 255)
BRIGHT = (0,  212, 255)
GOLD   = (245, 158,  11)
GREEN  = (16,  185, 129)
RED    = (239,  68,  68)
PURPLE = (124,  58, 237)
WHITE  = (255, 255, 255)
GREY   = (100, 116, 139)
LGREY  = (148, 163, 184)

# ── FONT HELPER ───────────────────────────────────────────────────────────────
def fnt(size, bold=False):
    candidates = []
    if sys.platform == "win32":
        base = "C:/Windows/Fonts/"
        candidates = [
            base + ("arialbd.ttf" if bold else "arial.ttf"),
            base + ("calibrib.ttf" if bold else "calibri.ttf"),
            base + "segoeui.ttf",
        ]
    for p in candidates:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except: pass
    return ImageFont.load_default()

# ── GRADIENT BACKGROUND ───────────────────────────────────────────────────────
def make_bg(c1=NAVY, c2=NAVY2, glow=BLUE):
    img = Image.new("RGB", (W, H), c1)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        r = int(c1[0]*(1-t) + c2[0]*t)
        g = int(c1[1]*(1-t) + c2[1]*t)
        b = int(c1[2]*(1-t) + c2[2]*t)
        d.line([(0,y),(W,y)], fill=(r,g,b))
    # top glow
    for radius in range(500, 0, -4):
        a = max(0, int(16*(1-radius/500)))
        gc = (min(255,glow[0]+a), min(255,glow[1]+a//3), min(255,glow[2]+a//2))
        d.ellipse([(W//2-radius,-radius//3),(W//2+radius, radius//2)], outline=gc)
    return img

# ── HUD OVERLAY ───────────────────────────────────────────────────────────────
def draw_hud(d, n, total, name):
    d.rectangle([(0,0),(W,62)], fill=(2,8,20))
    d.line([(0,62),(W,62)], fill=(30,80,180), width=1)
    d.text((44,16), "SHIELD AI", font=fnt(22,True), fill=BRIGHT)
    d.text((W//2,16), f"SCENE {n}/{total}  |  {name.upper()}", font=fnt(17), fill=GREY, anchor="mt")
    d.text((W-44,16), "ET AI HACKATHON 2.0", font=fnt(16), fill=GREY, anchor="rt")
    # progress
    d.rectangle([(0,61),(W,64)], fill=(8,20,40))
    d.rectangle([(0,61),(int(W*n/total),64)], fill=BRIGHT)
    # HUD corners
    L = 55
    for (x,y),(dx,dy) in [((18,80),(L,0)),((18,80),(0,L)),
                           ((W-18,80),(-L,0)),((W-18,80),(0,L)),
                           ((18,H-18),(L,0)),((18,H-18),(0,-L)),
                           ((W-18,H-18),(-L,0)),((W-18,H-18),(0,-L))]:
        d.line([(x,y),(x+dx,y+dy)], fill=(30,100,200), width=2)

# ── SUBTITLE BAR ─────────────────────────────────────────────────────────────
def draw_sub(d, text):
    if not text: return
    f = fnt(24)
    margin = 90
    max_w  = W - 2*margin - 40
    words  = text.split()
    lines, line = [], []
    for w in words:
        test = " ".join(line+[w])
        if d.textlength(test, font=f) > max_w:
            if line: lines.append(" ".join(line))
            line = [w]
        else:
            line.append(w)
    if line: lines.append(" ".join(line))
    lh = 34; box_h = len(lines)*lh + 24; box_y = H - box_h - 76
    d.rectangle([(margin,box_y-4),(W-margin,box_y+box_h+4)],
                fill=(2,8,23), outline=(30,80,180), width=1)
    for i,ln in enumerate(lines):
        d.text((W//2, box_y+12+i*lh), ln, font=f, fill=(235,242,250), anchor="mt")

# ── METRIC CARD ───────────────────────────────────────────────────────────────
def card(d, x, y, w, h, val, label, vc=BRIGHT, ac=BLUE):
    d.rectangle([(x,y),(x+w,y+h)], fill=(ac[0]//12,ac[1]//12,ac[2]//12),
                outline=(*ac,70), width=1)
    d.text((x+w//2,y+16), str(val), font=fnt(34,True), fill=vc, anchor="mt")
    d.text((x+w//2,y+h-16), label.upper(), font=fnt(13), fill=GREY, anchor="mb")

# ── BAR CHART ─────────────────────────────────────────────────────────────────
def bar_chart(d, x, y, w, h, vals, title):
    d.rectangle([(x,y),(x+w,y+h)], fill=(4,10,22), outline=(30,80,180), width=1)
    d.text((x+w//2,y+10), title, font=fnt(15,True), fill=GREY, anchor="mt")
    bw = (w-40)//len(vals)-4; bh = h-50; mv = max(vals) if vals else 1
    for i,v in enumerate(vals):
        bx = x+20+i*(bw+4); fh = int(bh*v/mv); by = y+h-24-fh
        for row in range(fh):
            t = row/max(fh,1)
            rc = int(BLUE[0]*t+BRIGHT[0]*(1-t))
            gc = int(BLUE[1]*t+BRIGHT[1]*(1-t))
            bc = int(BLUE[2]*t+BRIGHT[2]*(1-t))
            d.line([(bx,by+fh-row-1),(bx+bw,by+fh-row-1)], fill=(rc,gc,bc))

# ── DNA BAR ───────────────────────────────────────────────────────────────────
def dna_bar(d, x, y, label, pct, col):
    d.text((x,y+4), label, font=fnt(19), fill=LGREY)
    tx = x+290; tw = 780
    d.rectangle([(tx,y),(tx+tw,y+26)], fill=(8,16,34), outline=(30,50,80), width=1)
    fw = int(tw*pct/100)
    d.rectangle([(tx,y),(tx+fw,y+26)], fill=col)
    d.text((tx+fw+10,y+3), f"{pct}%", font=fnt(17,True), fill=col)

# ==============================================================================
# SCENE RENDERERS
# ==============================================================================

def scene_1_opening():
    img = make_bg((2,5,14),(6,12,26),RED)
    d   = ImageDraw.Draw(img)
    draw_hud(d,1,10,"National Crisis Overview")
    for r in range(480,0,-4):
        a = max(0,int(22*(1-r/480)))
        d.ellipse([(W//2-r,H//2-r-100),(W//2+r,H//2+r-100)], outline=(*RED,a))
    d.text((W//2,310), "India is facing an unprecedented rise in", font=fnt(54,True), fill=(240,240,240), anchor="mt")
    d.text((W//2,380), "CYBER FRAUD", font=fnt(96,True), fill=RED, anchor="mt")
    stats=[("Rs.10,000+ Cr","Lost Annually",200,560),
           ("12.3 Million","Complaints",640,560),
           ("7,000+","Cases Daily",1080,560),
           ("88%","Unresolved",1520,560)]
    for v,l,px,py in stats:
        d.rectangle([(px,py),(px+290,py+88)], fill=(28,4,4), outline=(*RED,110), width=1)
        d.text((px+145,py+10), v, font=fnt(30,True), fill=RED, anchor="mt")
        d.text((px+145,py+52), l, font=fnt(19), fill=LGREY, anchor="mt")
    for ax,ay in [(700,390),(920,470),(1100,370),(850,290),(1200,440)]:
        d.ellipse([(ax-8,ay-8),(ax+8,ay+8)], fill=RED)
        for r in [16,26,36]:
            d.ellipse([(ax-r,ay-r),(ax+r,ay+r)], outline=(*RED,max(4,55-r*2)), width=1)
    draw_sub(d,"India loses Rs.10,000+ Crores annually | 12.3 Million complaints | 88% cases unresolved")
    return img

def scene_2_reveal():
    img = make_bg((2,8,22),(4,12,30),BLUE)
    d   = ImageDraw.Draw(img)
    draw_hud(d,2,10,"SHIELD AI Brand Reveal")
    cx,cy = W//2,390
    for r in range(260,0,-5):
        a = max(0,int(22*(1-r/260)))
        d.ellipse([(cx-r,cy-r),(cx+r,cy+r)], outline=(*BLUE,a))
    spts = [(cx,cy-170),(cx+148,cy-72),(cx+148,cy+72),(cx,cy+170),(cx-148,cy+72),(cx-148,cy-72)]
    d.polygon(spts, fill=(0,44,190))
    d.polygon(spts, outline=(*BRIGHT,200), width=3)
    d.text((cx,cy-20), "AI", font=fnt(90,True), fill=WHITE, anchor="mm")
    d.text((W//2,590), "SHIELD AI", font=fnt(110,True), fill=WHITE, anchor="mt")
    d.text((W//2,716), "National Fraud Intelligence Operating System", font=fnt(32), fill=BRIGHT, anchor="mt")
    d.rectangle([(W//2-310,782),(W//2+310,826)], fill=(*GOLD,28), outline=(*GOLD,110), width=1)
    d.text((W//2,804), "ET AI Hackathon 2.0  |  Team SUKUMARKARNAM4", font=fnt(23,True), fill=GOLD, anchor="mm")
    draw_sub(d,"SHIELD AI - National Fraud Intelligence Operating System | ET AI Hackathon 2.0 | Team SUKUMARKARNAM4")
    return img

def scene_3_dashboard():
    img = make_bg(NAVY,NAVY2,BLUE)
    d   = ImageDraw.Draw(img)
    draw_hud(d,3,10,"Executive Command Center")
    d.text((110,90), "MODULE 01", font=fnt(17,True), fill=BRIGHT)
    d.text((110,118), "Executive Command Center", font=fnt(52,True), fill=WHITE)
    d.text((110,186), "Real-time national oversight of complaints, fraud families, and active investigations.", font=fnt(24), fill=LGREY)
    kpis=[("12,847","Total Complaints",BRIGHT,BLUE),("78.4","Threat Score",RED,RED),
          ("34","Fraud Families",GOLD,GOLD),("847","FIRs Generated",GREEN,GREEN),("5","High Risk States",PURPLE,PURPLE)]
    for i,(v,l,vc,ac) in enumerate(kpis):
        card(d,110+i*340,272,310,108,v,l,vc,ac)
    bar_chart(d,110,418,540,278,[95,82,68,57,47,38],"HIGH RISK STATES")
    ax,ay=690,418
    d.rectangle([(ax,ay),(ax+560,ay+278)], fill=(4,10,22), outline=(*BLUE,38), width=1)
    d.text((ax+280,ay+10), "LIVE THREAT ALERTS", font=fnt(15,True), fill=GREY, anchor="mt")
    alerts=[("CRITICAL","Rajasthan UPI Ring - 47 accounts",RED),
            ("HIGH","Mumbai phishing surge - 312 cases",GOLD),
            ("HIGH","Delhi OTP spike - 198 cases",GOLD),
            ("MED","UP SIM swap activity - 89 cases",GREEN)]
    for i,(lv,msg,col) in enumerate(alerts):
        d.rectangle([(ax+8,ay+38+i*54),(ax+552,ay+84+i*54)], fill=(8,16,30))
        d.text((ax+16,ay+46+i*54), f"[{lv}]", font=fnt(17,True), fill=col)
        d.text((ax+16,ay+68+i*54), msg, font=fnt(15), fill=LGREY)
    # Pie
    px,py,pr=1310,558,110
    segs=[(0.35,BLUE),(0.20,BRIGHT),(0.15,GOLD),(0.15,GREEN),(0.15,RED)]
    start=0
    for pct,col in segs:
        end=start+pct*360
        for deg in range(int(start),int(end)):
            rad=math.radians(deg-90)
            for r in range(1,pr):
                d.point((int(px+r*math.cos(rad)),int(py+r*math.sin(rad))), fill=col)
        start=end
    d.text((px,py+pr+14),"FRAUD FAMILIES",font=fnt(14),fill=GREY,anchor="mt")
    draw_sub(d,"Command Center: 12,847 complaints | 34 fraud families | Threat Score 78.4 | 847 FIRs auto-generated")
    return img

def scene_4_dna():
    img = make_bg((4,2,20),(8,4,32),PURPLE)
    d   = ImageDraw.Draw(img)
    draw_hud(d,4,10,"Fraud DNA Genome Index")
    d.text((110,90), "MODULE 02", font=fnt(17,True), fill=(167,139,250))
    d.text((110,118), "Fraud DNA Genome Index", font=fnt(52,True), fill=WHITE)
    d.text((110,186), "Six-vector digital fingerprint classifying every complaint into a fraud family.", font=fnt(24), fill=LGREY)
    dnas=[("Communication DNA",85,BLUE),("Financial DNA",92,PURPLE),("Behavioral DNA",78,(8,145,178)),
          ("Geo DNA",65,GREEN),("Language DNA",71,GOLD),("Temporal DNA",88,RED)]
    for i,(lbl,pct,col) in enumerate(dnas):
        dna_bar(d,110,280+i*68,lbl,pct,col)
    d.rectangle([(110,700),(1380,782)], fill=(*PURPLE,28), outline=(*PURPLE,110), width=2)
    d.text((124,718),"FAMILY MATCH:", font=fnt(21), fill=(167,139,250))
    d.text((330,714),"PIG BUTCHERING SYNDICATE  |  Code: PB-01  |  Threat: CRITICAL", font=fnt(25,True), fill=WHITE)
    d.text((1240,716),"96.2%", font=fnt(36,True), fill=(167,139,250))
    tags=[("Digital Arrest",RED),("UPI Fraud",BLUE),("WhatsApp Ring",GREEN),("Email Phishing",GOLD),("Pig Butchering",PURPLE)]
    for i,(nm,col) in enumerate(tags):
        fx=110+i*224
        d.rectangle([(fx,806),(fx+208,852)], fill=(*col,20), outline=(*col,90), width=1)
        d.text((fx+104,829), nm, font=fnt(17,True), fill=col, anchor="mm")
    draw_sub(d,"Fraud DNA Engine: 96.2% confidence | PIG BUTCHERING SYNDICATE detected | 6-vector fingerprint analysis")
    return img

def scene_5_graph():
    img = make_bg((2,10,20),(4,16,30),(8,145,178))
    d   = ImageDraw.Draw(img)
    draw_hud(d,5,10,"Fraud Entity Graph Intelligence")
    d.text((110,90), "MODULE 03", font=fnt(17,True), fill=(34,211,238))
    d.text((110,118), "Fraud Entity Graph Engine", font=fnt(52,True), fill=WHITE)
    d.text((110,186), "Reveals hidden criminal networks by connecting all fraud entities across India.", font=fnt(24), fill=LGREY)
    cx,cy=1100,540
    nodes=[(cx,cy,78,GOLD,"PB-01 Syndicate"),(cx-300,cy-200,58,GOLD,"Fraudster A"),
           (cx+280,cy-220,58,GOLD,"Fraudster B"),(cx-380,cy+180,52,RED,"Victim MH-01"),
           (cx+340,cy+160,52,RED,"Victim DL-47"),(cx+160,cy+260,48,BLUE,"UPI @ok"),
           (cx-180,cy+270,48,BLUE,"Phone +91"),(cx+60,cy-300,46,GREEN,"Mule Acc-01")]
    edges=[(0,1),(0,2),(0,3),(0,4),(0,5),(0,6),(1,3),(2,4),(5,1),(6,3),(7,0)]
    for a,b in edges:
        d.line([(nodes[a][0],nodes[a][1]),(nodes[b][0],nodes[b][1])], fill=(*BLUE,55), width=2)
    for nx,ny,nr,col,lbl in nodes:
        d.ellipse([(nx-nr,ny-nr),(nx+nr,ny+nr)], fill=(*col,28), outline=col, width=2)
        d.text((nx,ny), lbl, font=fnt(13,True), fill=col, anchor="mm")
    for i,(lbl,col) in enumerate([("Fraudster",GOLD),("Victim",RED),("UPI/Phone",BLUE),("Bank Account",GREEN)]):
        d.ellipse([(118+i*220,870),(140+i*220,892)], fill=col)
        d.text((148+i*220,874), lbl, font=fnt(17), fill=LGREY)
    draw_sub(d,"Graph Intelligence: Criminal networks exposed | Syndicates, victims, UPI IDs, bank accounts all connected")
    return img

def scene_6_investigation():
    img = make_bg((2,12,10),(4,18,14),GREEN)
    d   = ImageDraw.Draw(img)
    draw_hud(d,6,10,"Investigation Operations Desk")
    d.text((110,90), "MODULE 04", font=fnt(17,True), fill=(52,211,153))
    d.text((110,118), "Investigation Operations Desk", font=fnt(48,True), fill=WHITE)
    d.text((110,192), "AI-assisted case management with automated FIR generation and evidence correlation.", font=fnt(22), fill=LGREY)
    d.rectangle([(110,248),(430,348)], fill=(*GREEN,18), outline=(*GREEN,70), width=1)
    d.text((270,262),"74%", font=fnt(54,True), fill=GREEN, anchor="mt")
    d.text((270,324),"Faster FIR Generation", font=fnt(17), fill=GREY, anchor="mt")
    cases=[("INV-2847","Pig Butchering Fraud","Rajesh Kumar | Rs.12,40,000 | Maharashtra","CRITICAL",RED),
           ("INV-2841","OTP Impersonation Scam","Priya Singh | Rs.58,000 | Delhi NCR","HIGH",GOLD),
           ("INV-2839","Digital Arrest Fraud","Mohammed Ali | Rs.1,20,000 | Uttar Pradesh","MEDIUM",GREEN),
           ("INV-2835","FakeKYC Ring","Anita Sharma | Rs.85,000 | Rajasthan","ACTIVE",BLUE)]
    for i,(cid,title,sub,sev,col) in enumerate(cases):
        cy2=258+i*108
        d.rectangle([(470,cy2),(1820,cy2+96)], fill=(4,10,22))
        d.rectangle([(470,cy2),(474,cy2+96)], fill=col)
        d.text((490,cy2+10), f"#{cid}  -  {title}", font=fnt(21,True), fill=WHITE)
        d.text((490,cy2+44), sub, font=fnt(17), fill=LGREY)
        d.rectangle([(1700,cy2+22),(1810,cy2+72)], fill=(*col,22), outline=(*col,75), width=1)
        d.text((1755,cy2+47), sev, font=fnt(15,True), fill=col, anchor="mm")
    d.rectangle([(560,730),(1380,794)], fill=(*GREEN,180))
    d.text((970,762), "GENERATE FIR  -  AI ASSISTED", font=fnt(26,True), fill=WHITE, anchor="mm")
    draw_sub(d,"Investigation Desk: 74% faster FIR generation | AI evidence correlation | Automated threat assessment")
    return img

def scene_7_geomap():
    img = make_bg((14,8,2),(22,14,4),GOLD)
    d   = ImageDraw.Draw(img)
    draw_hud(d,7,10,"National Threat Intelligence Map")
    d.text((110,90), "MODULE 05", font=fnt(17,True), fill=(251,191,36))
    d.text((110,118), "National Threat Intelligence Map", font=fnt(46,True), fill=WHITE)
    d.text((110,192), "District and state-level heatmap across all 36 Indian states and union territories.", font=fnt(23), fill=LGREY)
    hs=[("Mumbai City","Maharashtra","1,247",RED),("New Delhi","Delhi","1,089",RED),
        ("Bengaluru","Karnataka","987",GOLD),("Jamtara","Jharkhand","623",GOLD),
        ("Mewat","Haryana","591",GOLD),("Hyderabad","Telangana","524",BLUE)]
    d.rectangle([(110,250),(680,260+len(hs)*66+44)], fill=(4,10,22), outline=(*GOLD,38), width=1)
    d.text((395,262),"RISK RANKING",font=fnt(17,True),fill=GREY,anchor="mt")
    for i,(city,state,cnt,col) in enumerate(hs):
        ry=300+i*66
        d.rectangle([(118,ry),(672,ry+56)], fill=(8,16,30))
        d.text((134,ry+8), f"#{i+1}", font=fnt(19,True), fill=col)
        d.text((186,ry+6), city, font=fnt(19,True), fill=WHITE)
        d.text((186,ry+30), state, font=fnt(14), fill=GREY)
        d.text((660,ry+16), cnt, font=fnt(20,True), fill=col, anchor="rt")
    mx,my=1140,540
    hots=[(mx-200,my-100,78,(*RED,150)),(mx+100,my-160,96,(*RED,190)),
          (mx-60,my+80,62,(*GOLD,140)),(mx+200,my+60,52,(*GOLD,120)),
          (mx-140,my+200,46,(*BLUE,110))]
    for hx,hy,hr,col in hots:
        for r in range(hr,0,-3):
            a=int(col[3]*(1-r/hr)) if len(col)>3 else 50
            d.ellipse([(hx-r,hy-r),(hx+r,hy+r)], fill=(*col[:3],a))
        d.ellipse([(hx-8,hy-8),(hx+8,hy+8)], fill=WHITE)
    draw_sub(d,"Geospatial Intelligence: Cybercrime hotspots identified | District-level tracking | 36 states monitored")
    return img

def scene_8_copilot():
    img = make_bg((20,2,12),(30,4,20),(190,24,93))
    d   = ImageDraw.Draw(img)
    draw_hud(d,8,10,"Citizen Copilot AI")
    d.text((110,90), "MODULE 06", font=fnt(17,True), fill=(244,114,182))
    d.text((110,118), "Citizen Copilot AI", font=fnt(60,True), fill=WHITE)
    d.text((110,196), "Multilingual AI safety assistant with real-time scam detection and SHIELD safety scoring.", font=fnt(22), fill=LGREY)
    langs=["Hindi","English","Tamil","Bengali","Telugu"]
    for i,lang in enumerate(langs):
        lx=110+i*192
        d.rectangle([(lx,254),(lx+174,296)], fill=(30,4,15), outline=(190,24,93), width=1)
        d.text((lx+87,275), lang, font=fnt(17,True), fill=(244,114,182), anchor="mm")
    chats=[("Someone asked me to pay Rs.50 to receive Rs.5 lakh prize. Is this safe?","user"),
           ("FRAUD ALERT: Advance fee scam. Matches FakeReward Syndicate.\nDo NOT pay. SHIELD Score: 8/100 - CRITICAL RISK. Report to cybercrime.gov.in","bot"),
           ("Check UPI ID: suspicious@upi","user"),
           ("Found in 47 fraud complaints. Linked to OTP Mafia Network.\nSHIELD Score: 12/100. Block this contact immediately.","bot")]
    cy3=316
    for msg,who in chats:
        lines_c=textwrap.wrap(msg,58)
        bh=len(lines_c)*27+18
        bx,bw2=(1020,740) if who=="user" else (110,860)
        col_b=(28,52,110) if who=="user" else (12,24,46)
        col_t=(203,213,225) if who=="user" else (226,232,240)
        col_o=BLUE if who=="user" else (50,70,110)
        d.rectangle([(bx,cy3),(bx+bw2,cy3+bh)], fill=col_b, outline=col_o, width=1)
        for li,ln in enumerate(lines_c):
            d.text((bx+12,cy3+8+li*27), ln, font=fnt(17), fill=col_t)
        cy3+=bh+9
    sx,sy,sr=1700,618,86
    for deg in range(360):
        rad=math.radians(deg-90)
        col=GREEN if deg<282 else (24,40,70)
        for r in range(sr-16,sr):
            d.point((int(sx+r*math.cos(rad)),int(sy+r*math.sin(rad))), fill=col)
    d.text((sx,sy),"78",font=fnt(44,True),fill=GREEN,anchor="mm")
    d.text((sx,sy+sr+14),"SHIELD SCORE",font=fnt(14,True),fill=GREEN,anchor="mt")
    draw_sub(d,"Citizen Copilot: Real-time scam detection | Hindi, English, Tamil, Bengali, Telugu | SHIELD Safety Score")
    return img

def scene_9_impact():
    img = make_bg(NAVY,NAVY2,BRIGHT)
    d   = ImageDraw.Draw(img)
    draw_hud(d,9,10,"Impact and National Results")
    d.text((W//2,100),"SHIELD AI by Numbers",font=fnt(64,True),fill=WHITE,anchor="mt")
    d.text((W//2,180),"Measurable National Impact",font=fnt(28),fill=BRIGHT,anchor="mt")
    metrics=[("74%","Faster FIR Generation"),("87%","Fraud Detection Accuracy"),
             ("10x","Faster Syndicate Discovery"),("Rs.4,820Cr","Fraud Amount Tracked"),
             ("34","Fraud Families Profiled"),("5 Languages","Citizen Copilot Reach")]
    for i,(val,lbl) in enumerate(metrics):
        col=i%3; row=i//3
        cx2=180+col*552; cy2=268+row*296
        d.rectangle([(cx2,cy2),(cx2+494,cy2+268)], fill=(*BLUE,12), outline=(*BLUE,48), width=1)
        d.text((cx2+247,cy2+24),val,font=fnt(62,True),fill=BRIGHT,anchor="mt")
        d.text((cx2+247,cy2+110),lbl,font=fnt(22),fill=LGREY,anchor="mt")
    draw_sub(d,"87% detection accuracy | 74% faster FIR | 10x syndicate discovery | Rs.4,820 Cr tracked | 34 families profiled")
    return img

def scene_10_finale():
    img = make_bg((2,8,22),(3,10,28),BLUE)
    d   = ImageDraw.Draw(img)
    draw_hud(d,10,10,"Team SHIELD - Grand Finale")
    cx2,cy2=W//2,268
    for r in range(260,0,-5):
        a=max(0,int(26*(1-r/260)))
        d.ellipse([(cx2-r,cy2-r),(cx2+r,cy2+r)], outline=(*BLUE,a))
    spts=[(cx2,cy2-138),(cx2+128,cy2-58),(cx2+128,cy2+58),(cx2,cy2+138),(cx2-128,cy2+58),(cx2-128,cy2-58)]
    d.polygon(spts, fill=(0,38,178))
    d.polygon(spts, outline=(*BRIGHT,200), width=3)
    d.text((cx2,cy2),"AI",font=fnt(72,True),fill=WHITE,anchor="mm")
    d.text((W//2,442),"SHIELD AI",font=fnt(96,True),fill=WHITE,anchor="mt")
    d.text((W//2,552),"National Fraud Intelligence Operating System",font=fnt(30),fill=BRIGHT,anchor="mt")
    d.rectangle([(W//2-306,614),(W//2+306,658)], fill=(*GOLD,24), outline=(*GOLD,100), width=1)
    d.text((W//2,636),"ET AI Hackathon 2.0  |  Team SUKUMARKARNAM4",font=fnt(21,True),fill=GOLD,anchor="mm")
    members=[("Sukumar Karanam","Frontend & AI/ML Eng."),
             ("Shaik Mujeeb Basha","Backend Developer"),
             ("Bondada Tejendra","Database Engineer")]
    for i,(name,role) in enumerate(members):
        tx=246+i*468
        d.rectangle([(tx,686),(tx+428,820)], fill=(*BLUE,10), outline=(*BLUE,55), width=1)
        d.ellipse([(tx+174,694),(tx+254,774)], fill=(0,44,188))
        d.text((tx+214,734),str(i+1),font=fnt(34,True),fill=WHITE,anchor="mm")
        d.text((tx+214,786),name,font=fnt(20,True),fill=WHITE,anchor="mt")
        d.text((tx+214,812),role,font=fnt(15),fill=LGREY,anchor="mt")
    d.text((W//2,842),"Nalanda Degree College",font=fnt(22,True),fill=GOLD,anchor="mt")
    d.text((W//2,884),'"Protecting Citizens. Empowering Investigators. Defending Digital India."',font=fnt(22),fill=LGREY,anchor="mt")
    draw_sub(d,"Team SUKUMARKARNAM4 | Sukumar Karanam | Shaik Mujeeb Basha | Bondada Tejendra | Nalanda Degree College")
    return img

# ==============================================================================
# VOICE NARRATION
# ==============================================================================
VOICEOVERS=[
    "India is facing an unprecedented rise in cyber fraud. Every day, thousands of citizens become victims of digital arrest scams, UPI frauds, phishing attacks, identity theft, and organized cybercrime networks. India loses over ten thousand crores annually to digital fraud.",
    "Introducing SHIELD AI. A National Fraud Intelligence Operating System designed to transform cybercrime investigation and fraud prevention using Artificial Intelligence. Developed by Team SUKUMARKARNAM4 for the ET AI Hackathon 2.0.",
    "The Executive Command Center provides a real-time national overview of fraud activity. Investigators can monitor twelve thousand eight hundred complaints, thirty four active fraud families, a threat score of seventy eight point four, and eight hundred forty seven auto-generated FIRs.",
    "The Fraud DNA Engine converts every complaint into a unique digital fingerprint. It analyzes communication patterns, financial behavior, behavioral tactics, geographic spread, language characteristics, and temporal cycles. The engine classifies fraud into families with up to ninety six percent confidence.",
    "The Fraud Graph Intelligence Engine reveals hidden criminal networks. It connects suspects, victims, phone numbers, bank accounts, and UPI IDs into an interactive network. This transforms isolated complaints into a complete criminal intelligence picture, exposing syndicates and money trails.",
    "The Investigation Operations Desk automates evidence collection, threat assessment, investigation summaries, and FIR recommendations. Artificial Intelligence reduces FIR preparation time by seventy four percent, significantly accelerating cybercrime case resolution.",
    "The Geospatial Intelligence Engine identifies cybercrime hotspots across districts and states. The threat density heatmap covers all thirty six Indian states and union territories. Real-time geographic intelligence supports proactive law enforcement resource allocation.",
    "The Citizen Copilot empowers citizens with AI-powered fraud awareness. It provides instant scam detection, multilingual support in Hindi, English, Tamil, Bengali, and Telugu, and personalized SHIELD Safety Scores to protect citizens before losses occur.",
    "SHIELD AI delivers measurable national impact. Eighty seven percent fraud detection accuracy. Seventy four percent faster FIR generation. Ten times faster syndicate discovery. Four thousand eight hundred crores in fraud tracked. Thirty four fraud families profiled across India.",
    "SHIELD AI. Developed by Team SUKUMARKARNAM4. Sukumar Karanam, Shaik Mujeeb Basha, and Bondada Tejendra from Nalanda Degree College. Protecting Citizens. Empowering Investigators. Defending Digital India. Thank you."
]

DURATIONS=[24.0, 24.0, 24.0, 24.0, 24.0, 24.0, 24.0, 24.0, 24.0, 24.0]

BUILDERS=[scene_1_opening,scene_2_reveal,scene_3_dashboard,scene_4_dna,scene_5_graph,
          scene_6_investigation,scene_7_geomap,scene_8_copilot,scene_9_impact,scene_10_finale]

SNAMES=["Opening","Reveal","Dashboard","Fraud DNA","Graph",
        "Investigation","Geo Map","Copilot","Impact","Finale"]

# ==============================================================================
# BACKGROUND MUSIC
# ==============================================================================
def gen_music(dur, sr=44100):
    t = np.linspace(0, dur, int(sr*dur), False)
    bass  = 0.20*np.sin(2*np.pi*55*t) + 0.10*np.sin(2*np.pi*82.4*t)
    pulse_env = np.zeros_like(t)
    for beat in np.arange(0, dur, 1.5):
        mask=(t>=beat)&(t<beat+0.6)
        pulse_env[mask]=np.exp(-6*(t[mask]-beat))
    pulse = 0.12*np.sin(2*np.pi*110*t)*pulse_env
    arp_notes=[130,155,174,207,220,261,207,174]
    arp=np.zeros_like(t)
    for i,freq in enumerate(arp_notes*((int(dur//4))+2)):
        st=i*0.55; en=st+1.1
        if st>=dur: break
        mask=(t>=st)&(t<min(en,dur))
        arp[mask]+=0.035*np.sin(2*np.pi*freq*t[mask])*np.exp(-2*(t[mask]-st))
    shimmer=0.014*np.sin(2*np.pi*880*t)*np.sin(2*np.pi*0.28*t+1)
    mix=bass+pulse+arp+shimmer
    peak=np.max(np.abs(mix))
    if peak>0: mix=mix/peak*0.32
    stereo=np.stack([mix,mix],axis=1)
    return (stereo*32767).astype(np.int16)

# ==============================================================================
# MAIN
# ==============================================================================
def main():
    SEP="="*62
    print(SEP)
    print("  SHIELD AI - Full Video Generator")
    print("  Output: SHIELD_AI_ET_AI_HACKATHON_DEMO.mp4")
    print("  Resolution: 1920x1080 | 30fps | MP4 H.264")
    print(SEP)

    clips=[]
    total_dur=0

    for i,(builder,name,dur) in enumerate(zip(BUILDERS,SNAMES,DURATIONS)):
        print(f"\n[{i+1}/10] Scene: {name}")

        # Render slide
        print("  >> Rendering 1920x1080 slide...")
        sp=TMPDIR/f"s{i:02d}.png"
        builder().save(str(sp))

        # Voice
        vp=TMPDIR/f"v{i:02d}.mp3"
        print("  >> Generating voice narration...")
        has_v=False
        try:
            gTTS(text=VOICEOVERS[i], lang='en', tld='co.in', slow=False).save(str(vp))
            has_v=True
        except Exception as e:
            print(f"  [!] Voice error: {e}")

        # Duration
        voice_clip=None
        if has_v and vp.exists() and vp.stat().st_size>500:
            try:
                voice_clip=AudioFileClip(str(vp))
                scene_dur=max(voice_clip.duration+1.2, float(dur))
            except: scene_dur=float(dur)
        else:
            scene_dur=float(dur)

        # Music
        print(f"  >> Generating cinematic BGM ({scene_dur:.1f}s)...")
        sr=44100
        music_arr=gen_music(scene_dur,sr)
        music_clip=_vol(_dur(AudioArrayClip(music_arr,fps=sr), scene_dur), 0.17)

        # Mix
        if voice_clip:
            audio=CompositeAudioClip([music_clip, _vol(voice_clip, 0.93)])
        else:
            audio=music_clip

        # Clip
        vc=_audio(_fps(_dur(ImageClip(str(sp)), scene_dur), FPS), audio)
        clips.append(vc)
        total_dur+=scene_dur
        print(f"  [OK] Scene {i+1} complete | Duration: {scene_dur:.1f}s")

    print(f"\n{SEP}")
    print("  Concatenating 10 scenes...")
    final=concatenate_videoclips(clips, method="compose")

    print(f"  Exporting MP4: {OUT}")
    print("  Please wait (3-6 minutes)...")
    # MoviePy v2 removed verbose/logger/bitrate kwargs — use version-safe call
    write_kwargs = dict(fps=FPS, codec="libx264", audio_codec="aac", preset="medium")
    if not MOPY2:
        write_kwargs.update(bitrate="4000k", audio_bitrate="192k", verbose=False, logger=None)
    else:
        write_kwargs["logger"] = None  # v2 still accepts logger=None
    final.write_videofile(OUT, **write_kwargs)

    shutil.rmtree(TMPDIR, ignore_errors=True)

    sz=os.path.getsize(OUT)/1024/1024
    mins=int(total_dur)//60; secs=int(total_dur)%60
    print(f"\n{SEP}")
    print("  VIDEO RENDER COMPLETE")
    print(f"  File Name : {OUT}")
    print(f"  Resolution: 1920x1080 Full HD")
    print(f"  Duration  : {mins}m {secs}s")
    print(f"  File Size : {sz:.1f} MB")
    print(f"  FPS       : {FPS}")
    print(f"  Codec     : H.264 / AAC")
    print(f"  Status    : Ready for Download")
    print(f"  Location  : {os.path.abspath(OUT)}")
    print(SEP)

if __name__=="__main__":
    main()
