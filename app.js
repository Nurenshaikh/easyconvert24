/* ConvertEasy v2 — browser-first conversions. PDF-to-Office layout fidelity is not guaranteed. */
(() => {
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const modal=$("#tool-modal"), controls=$("#tool-controls"), status=$("#status");
let current="";
if(window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
$("#year").textContent=new Date().getFullYear();
const meta={
"jpg-pdf":["JPG to PDF","Select one or more JPG/PNG images. They will be combined into one PDF."],
"pdf-jpg":["PDF to JPG","Render every PDF page to a JPG image and download each page."],
"merge":["Merge PDF","Select two or more PDF files to combine them in order."],
"split":["Split PDF","Enter page numbers or ranges, for example 1,3-5."],
"rotate":["Rotate PDF","Rotate every page by 90, 180 or 270 degrees."],
"compress-pdf":["Compress PDF","Re-save the PDF structure. This may not significantly reduce image-heavy PDFs."],
"png-jpg":["PNG to JPG","Convert a PNG image to JPG. Transparent areas become white."],
"jpg-png":["JPG to PNG","Convert a JPG image to PNG."],
"compress-image":["Compress Image","Choose an output quality to reduce JPG file size."],
"resize":["Resize Image","Set the output width and height in pixels."],
"word-pdf":["Word to PDF","Convert DOCX in your browser. Complex layouts may differ; use server mode for best results."],
"pdf-word":["PDF to Word","Extract selectable text from a PDF into an editable DOCX. Scanned PDFs need OCR."],
"excel-pdf":["Excel to PDF","Export the first worksheet as a clean PDF table."],
"pdf-excel":["PDF to Excel","Extract PDF text into spreadsheet rows. Best for simple text-based tables."]
};
function inputFiles(accept,multiple=false){return `<div class="drop"><strong>Choose your file${multiple?"s":""}</strong><p class="muted">Files are processed locally unless you choose server conversion.</p><input id="files" type="file" accept="${accept}" ${multiple?"multiple":""}></div>`}
function renderTool(id){
current=id;$("#modal-title").textContent=meta[id][0];$("#modal-desc").textContent=meta[id][1];status.textContent="";
let extra="";
if(id==="split")extra='<div class="field"><label>Pages to extract<input id="pages" placeholder="1, 3-5" value="1"></label></div>';
if(id==="rotate")extra='<div class="field"><label>Rotation<select id="degrees"><option>90</option><option>180</option><option>270</option></select></label></div>';
if(id==="compress-image")extra='<div class="field"><label>JPG quality (0.1–1)<input id="quality" type="number" min=".1" max="1" step=".05" value=".7"></label></div>';
if(id==="resize")extra='<div class="field"><label>Width (px)<input id="width" type="number" min="1" value="1200"></label><label>Height (px)<input id="height" type="number" min="1" value="1200"></label></div>';
if(id==="pdf-jpg")extra='<div class="field"><label>JPG quality (0.1–1)<input id="quality" type="number" min=".1" max="1" step=".05" value=".9"></label></div>';
if(["word-pdf","excel-pdf"].includes(id))extra='<div class="field"><label><input id="server" type="checkbox" style="width:auto"> Try configured server converter (advanced; sends file to server)</label></div>';
controls.innerHTML=inputFiles(({ "jpg-pdf":"image/jpeg,image/png","pdf-jpg":"application/pdf","merge":"application/pdf","split":"application/pdf","rotate":"application/pdf","compress-pdf":"application/pdf","png-jpg":"image/png","jpg-png":"image/jpeg","compress-image":"image/*","resize":"image/*","word-pdf":".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document","pdf-word":"application/pdf","excel-pdf":".xlsx,.xls","pdf-excel":"application/pdf"})[id],id==="jpg-pdf"||id==="merge")+extra+'<button class="run" id="run">Convert & download</button>';
$("#run").addEventListener("click",run);
modal.classList.add("show");modal.setAttribute("aria-hidden","false");
}
$$(".open-tool").forEach(b=>b.addEventListener("click",()=>renderTool(b.dataset.action)));
$("#close-modal").addEventListener("click",close);modal.addEventListener("click",e=>{if(e.target===modal)close()});
function close(){modal.classList.remove("show");modal.setAttribute("aria-hidden","true")}
$$(".filter").forEach(b=>b.addEventListener("click",()=>{$$(".filter").forEach(x=>x.classList.toggle("active",x===b));$$(".tool").forEach(t=>t.hidden=b.dataset.filter!=="all"&&t.dataset.cat!==b.dataset.filter)}));
$("#search").addEventListener("input",e=>{let q=e.target.value.toLowerCase();$$(".tool").forEach(t=>t.hidden=!t.innerText.toLowerCase().includes(q))});
function say(s){status.textContent=s}
function download(blob,name){let a=document.createElement("a"),u=URL.createObjectURL(blob);a.href=u;a.download=name;a.className="download";a.textContent="Download "+name;status.append(" ");status.append(a);a.click();setTimeout(()=>URL.revokeObjectURL(u),60000)}
function stem(f){return f.name.replace(/\.[^.]+$/,"")}
async function imageFrom(file){return new Promise((res,rej)=>{let im=new Image(),u=URL.createObjectURL(file);im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=rej;im.src=u})}
function canvasBlob(c,type,q){return new Promise(r=>c.toBlob(r,type,q))}
async function pdfDoc(f){return PDFLib.PDFDocument.load(await f.arrayBuffer())}
async function pdfText(f){let doc=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise,rows=[];for(let n=1;n<=doc.numPages;n++){let p=await doc.getPage(n),c=await p.getTextContent();rows.push(c.items.map(x=>x.str).join(" "));}return rows}
function parsePages(s,max){let set=new Set();for(let part of s.split(",")){let [a,b]=part.trim().split("-").map(Number);if(!a||a<1||a>max)continue;if(!b)b=a;for(let i=a;i<=Math.min(b,max);i++)set.add(i-1)}return [...set].sort((a,b)=>a-b)}
async function run(){
let btn=$("#run"),files=$("#files").files;if(!files.length){say("Please select a file first.");return}
btn.disabled=true;say("Working…");
try{
if($("#server")?.checked){await serverConvert(files[0]);return}
switch(current){
case"jpg-pdf":{let out=await PDFLib.PDFDocument.create();for(let f of files){let bytes=await f.arrayBuffer(),im=f.type==="image/png"?await out.embedPng(bytes):await out.embedJpg(bytes),page=out.addPage([im.width,im.height]);page.drawImage(im,{x:0,y:0,width:im.width,height:im.height})}download(new Blob([await out.save()],{type:"application/pdf"}),"images.pdf");break}
case"pdf-jpg":{let doc=await pdfjsLib.getDocument({data:await files[0].arrayBuffer()}).promise,q=Math.min(1,Math.max(.1,Number($("#quality").value)||.9));for(let n=1;n<=doc.numPages;n++){let p=await doc.getPage(n),v=p.getViewport({scale:1.6}),c=document.createElement("canvas");c.width=v.width;c.height=v.height;await p.render({canvasContext:c.getContext("2d"),viewport:v}).promise;download(await canvasBlob(c,"image/jpeg",q),`${stem(files[0])}-page-${n}.jpg`)}break}
case"merge":{if(files.length<2)throw Error("Select at least two PDF files.");let out=await PDFLib.PDFDocument.create();for(let f of files){let d=await pdfDoc(f),pages=await out.copyPages(d,d.getPageIndices());pages.forEach(p=>out.addPage(p))}download(new Blob([await out.save()],{type:"application/pdf"}),"merged.pdf");break}
case"split":{let d=await pdfDoc(files[0]),ids=parsePages($("#pages").value,d.getPageCount());if(!ids.length)throw Error("No valid page numbers found.");let out=await PDFLib.PDFDocument.create(),ps=await out.copyPages(d,ids);ps.forEach(p=>out.addPage(p));download(new Blob([await out.save()],{type:"application/pdf"}),"split-pages.pdf");break}
case"rotate":{let d=await pdfDoc(files[0]),deg=Number($("#degrees").value);d.getPages().forEach(p=>p.setRotation(PDFLib.degrees((p.getRotation().angle+deg)%360)));download(new Blob([await d.save()],{type:"application/pdf"}),"rotated.pdf");break}
case"compress-pdf":{let d=await pdfDoc(files[0]);download(new Blob([await d.save({useObjectStreams:true})],{type:"application/pdf"}),"optimized.pdf");say("PDF re-saved. Note: this basic browser method cannot recompress embedded images, so file size may not decrease.");break}
case"png-jpg":case"jpg-png":case"compress-image":case"resize":{let f=files[0],im=await imageFrom(f),c=document.createElement("canvas"),w=im.naturalWidth,h=im.naturalHeight;if(current==="resize"){w=Math.max(1,Number($("#width").value)||w);h=Math.max(1,Number($("#height").value)||h)}c.width=w;c.height=h;let ctx=c.getContext("2d");if(current==="png-jpg"){ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h)}ctx.drawImage(im,0,0,w,h);let type=current==="jpg-png"?"image/png": "image/jpeg",q=current==="compress-image"?Math.min(1,Math.max(.1,Number($("#quality").value)||.7)):.92;download(await canvasBlob(c,type,q),`${stem(f)}.${type==="image/png"?"png":"jpg"}`);break}
case"pdf-word":{let pages=await pdfText(files[0]),paragraphs=pages.flatMap((p,i)=>[...(p?[{text:p,options:{breakLine:true}}]:[]),...(i<pages.length-1?[{text:"",options:{breakLine:true}}]:[])]);if(!paragraphs.length)throw Error("No selectable text found. This may be a scanned PDF; OCR is not included.");let doc=new docx.Document({sections:[{children:paragraphs.map(p=>new docx.Paragraph(p))}]});download(await docx.Packer.toBlob(doc),`${stem(files[0])}.docx`);say("Text extracted. Complex formatting, tables and images are not preserved.");break}
case"word-pdf":{let r=await mammoth.convertToHtml({arrayBuffer:await files[0].arrayBuffer()}),box=document.createElement("div");box.innerHTML=r.value;box.style.cssText="position:fixed;left:-10000px;top:0;width:760px;padding:35px;background:white;color:black;font:14px Arial";document.body.append(box);let c=await html2canvas(box,{scale:1.5});box.remove();let {jsPDF}=window.jspdf,pdf=new jsPDF({unit:"px",format:[c.width,c.height]});pdf.addImage(c.toDataURL("image/jpeg",.92),"JPEG",0,0,c.width,c.height);download(pdf.output("blob"),`${stem(files[0])}.pdf`);say("Converted. The document is rendered as page-sized images; layout may vary.");break}
case"excel-pdf":{let wb=XLSX.read(await files[0].arrayBuffer()),ws=wb.Sheets[wb.SheetNames[0]],data=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});let {jsPDF}=window.jspdf,pdf=new jsPDF({orientation:"landscape"});let y=20;for(let row of data){let line=row.map(x=>String(x)).join(" | ");let lines=pdf.splitTextToSize(line,260);for(let l of lines){if(y>190){pdf.addPage();y=20}pdf.text(l,12,y);y+=7}}download(pdf.output("blob"),`${stem(files[0])}.pdf`);break}
case"pdf-excel":{let rows=(await pdfText(files[0])).map(t=>t.split(/\s{2,}|\t|\s+\|\s+/).filter(Boolean));if(!rows.some(r=>r.length))throw Error("No selectable PDF text found. Scanned PDFs need OCR.");let wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),"Extracted");download(new Blob([XLSX.write(wb,{bookType:"xlsx",type:"array"})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),`${stem(files[0])}.xlsx`);say("Text extracted into rows. This is best-effort and may not reconstruct complex tables.");break}
}
}catch(e){say("Could not convert: "+(e.message||e))}finally{btn.disabled=false}
}
async function serverConvert(file){
const url=window.CONVERTEASY_API_URL;if(!url)throw Error("Server converter is not configured. Deploy the included API, then set CONVERTEASY_API_URL in app.js. You can uncheck server mode to use browser conversion.");
const form=new FormData();form.append("file",file);form.append("target",current);
say("Uploading securely to the configured conversion server…");
const r=await fetch(url.replace(/\/$/,"")+"/convert",{method:"POST",body:form});if(!r.ok)throw Error((await r.text()).slice(0,250)||"Server conversion failed.");
const blob=await r.blob(),ext={"word-pdf":"pdf","pdf-word":"docx","excel-pdf":"pdf","pdf-excel":"xlsx"}[current];download(blob,`${stem(file)}-converted.${ext}`);
}
})();