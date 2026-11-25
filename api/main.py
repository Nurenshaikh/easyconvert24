"""Optional server converter for ConvertEasy. Requires LibreOffice installed in the container."""
import os, shutil, subprocess, tempfile
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
app=FastAPI(title="ConvertEasy Conversion API")
ORIGINS=[x.strip() for x in os.getenv("ALLOWED_ORIGINS","").split(",") if x.strip()]
app.add_middleware(CORSMiddleware,allow_origins=ORIGINS or ["*"],allow_methods=["POST","GET"],allow_headers=["*"])
@app.get("/health")
def health(): return {"ok":True,"engine":"LibreOffice"}
@app.post("/convert")
async def convert(file: UploadFile=File(...),target: str=Form(...)):
    mapping={"word-pdf":(".docx",".pdf"),"excel-pdf":(".xlsx",".pdf")}
    if target not in mapping: raise HTTPException(400,"Unsupported conversion target")
    src_ext,out_ext=mapping[target]
    suffix=Path(file.filename or "").suffix.lower()
    if suffix not in (src_ext, ".doc" if src_ext==".docx" else ".xls" if src_ext==".xlsx" else src_ext):
        raise HTTPException(415,f"This tool expects {src_ext} input")
    data=await file.read()
    if len(data)>25*1024*1024: raise HTTPException(413,"Maximum upload size is 25 MB")
    with tempfile.TemporaryDirectory() as td:
        src=Path(td)/("input"+suffix);src.write_bytes(data)
        profile=Path(td)/"lo-profile"
        cmd=["libreoffice",f"-env:UserInstallation=file://{profile}","--headless","--convert-to",out_ext.lstrip("."),"--outdir",td,str(src)]
        try: p=subprocess.run(cmd,capture_output=True,text=True,timeout=90)
        except subprocess.TimeoutExpired: raise HTTPException(504,"Conversion timed out")
        out=Path(td)/("input"+out_ext)
        if p.returncode or not out.exists(): raise HTTPException(422,"Conversion failed: "+(p.stderr or p.stdout)[-500:])
        # Return bytes before TemporaryDirectory cleanup via response content
        from fastapi.responses import Response
        mime={".pdf":"application/pdf",".docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",".xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}[out_ext]
        return Response(out.read_bytes(),media_type=mime,headers={"Content-Disposition":f'attachment; filename="converted{out_ext}"',"Cache-Control":"no-store"})
