"use strict";
const fs=require("node:fs"),path=require("node:path"),{execFileSync}=require("node:child_process");
const root=path.resolve(__dirname,".."),game=path.join(root,"game");
const assetAudit=require("./audit-game-assets.cjs").audit();
const includedAssets=new Set(assetAudit.filter(a=>a.include).map(a=>a.file));
const out=path.resolve(process.argv[2]||path.join(root,".local","game-site"));
if(out===root||out===game||root.startsWith(out+path.sep)||game.startsWith(out+path.sep))throw new Error("Output cannot contain project sources.");
if(fs.existsSync(out)&&fs.readdirSync(out).length)throw new Error("Choose a new empty output directory.");
for(const file of ["index.html","styles.css","app.js"])if(!fs.statSync(path.join(game,file)).isFile())throw new Error("Missing game file: "+file);
const manifest=JSON.parse(fs.readFileSync(path.join(game,"assets","px","manifest.json"),"utf8"));
for(const [name,meta]of Object.entries(manifest)){
 for(const suffix of meta.blink?["","-blink","-happy"]:[""])if(!fs.existsSync(path.join(game,"assets","px",name+suffix+".png")))throw new Error("Missing sprite: "+name+suffix);
}
function validateAssets(dir){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  if(item.isSymbolicLink())throw new Error("Asset symlinks are not supported.");
  const file=path.join(dir,item.name);
  if(item.isDirectory())validateAssets(file);
  else if(!/\.(png|svg|jpe?g|webp|gif|avif|json|woff2?)$/i.test(item.name))throw new Error("Unexpected asset type: "+item.name);
 }
}
validateAssets(path.join(game,"assets"));
fs.mkdirSync(out,{recursive:true});
for(const file of ["index.html","styles.css","app.js"])fs.copyFileSync(path.join(game,file),path.join(out,file));
function copyAssets(from,to,prefix=""){fs.mkdirSync(to,{recursive:true});for(const entry of fs.readdirSync(from,{withFileTypes:true})){const src=path.join(from,entry.name),dest=path.join(to,entry.name),rel=prefix+entry.name;if(entry.isDirectory())copyAssets(src,dest,rel+"/");else if(includedAssets.has(rel))fs.copyFileSync(src,dest);}}
copyAssets(path.join(game,"assets"),path.join(out,"assets"));
fs.writeFileSync(path.join(out,".nojekyll"),"");
let commit=process.env.GITHUB_SHA;
if(!commit)commit=execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim();
fs.writeFileSync(path.join(out,"build-info.json"),JSON.stringify({commit,mode:"single-player",onchain:false,multiplayer:false,builtAt:new Date().toISOString()},null,2)+"\n");
console.log("Static game ready: "+out);
console.log("Included: index.html, styles.css, app.js, assets/, .nojekyll, build-info.json");
