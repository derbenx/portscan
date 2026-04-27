//to do
//needs ip checker line: ~161
nx=0; // nextcloud=1
const chk= nx==0 ? "chk.php" : "chk";
const arr=['ip','st','ed','sp','ep','to'];
const pr=document.getElementById('pr'); //log area
const ver = document.getElementById('ver');
ver.innerHTML="(Ver 1.1.0)";
const ip = document.getElementById('ip');
const st = document.getElementById('st');
const ed = document.getElementById('ed');
const sp = document.getElementById('sp');
const ep = document.getElementById('ep');
const to = document.getElementById('to');
ip.addEventListener('click', function(){ updat(0) });
ip.addEventListener('keyup', function(){ updt(0) });
st.addEventListener('click', function(){ updat(1) });
st.addEventListener('keyup', function(){ updt(1) });
ed.addEventListener('click', function(){ updat(2) });
ed.addEventListener('keyup', function(){ updt(2) });
sp.addEventListener('click', function(){ updat(3) });
sp.addEventListener('keyup', function(){ updt(3) });
ep.addEventListener('click', function(){ updat(4) });
ep.addEventListener('keyup', function(){ updt(4) });
to.addEventListener('click', function(){ updat(5) });
to.addEventListener('keyup', function(){ updt(5) });

const pgsw = document.getElementById('pgsw');
const prsw = document.getElementById('prsw');
const prsc = document.getElementById('prsc');
const stsc = document.getElementById('stsc');
pgsw.addEventListener('click', function(){ stps(-1) });
prsw.addEventListener('click', function(){ stps(0) });
prsc.addEventListener('click', function(){ stps(1) });
stsc.addEventListener('click', stop);

var con=1; //continue
var scan=0; // portscan mode: 1=port scan, 0=port sweep -1=ping sweep
var i=-1;
//setTimeout( function(){doit("<?php echo $ip; ?>"+i)},100);

function stps(xx){
 if (ip.style.background=="red") { return; }
 rstclr()
 //console.log(xx);
 if (xx==-1) {
  ip.style.background="green";
  st.style.background="green";
  ed.style.background="green";
 }
 if (xx==0) {
  ip.style.background="green";
  st.style.background="green";
  ed.style.background="green";
  sp.style.background="green";
 }
 if (xx==1) {
  ip.style.background="green";
  st.style.background="green";
  sp.style.background="green";
  ep.style.background="green";
 }
 //console.log(xx);
 con=0; scan=xx; i=-1;
 pr.innerHTML='';
 setTimeout( function(){ con=1; doit(); },1000);
}

function doit(){ //construct data for ajax
 pr.style.height=window.innerHeight-pr.offsetTop-20;
 if (con==0){ return; }
 //console.log('c'+i);
 var ip4=ip.value;
 if (scan==-1) { //ping ip sweep
  if (i==-1) { i=st.value };
  ip4+='.'+i;
  pt='p'; //ping
  i = (i>=ed.value) ? st.value*1 : (i*1)+1 ;
 }
 if (scan==0) { //port ip sweep
  if (i==-1) { i=st.value };
  ip4+='.'+i;
  pt=sp.value;
  i = (i>=ed.value) ? st.value*1 : (i*1)+1 ;
 }
 if (scan==1) { // port scan
  if (i==-1) { i=sp.value };
  ip4+='.'+st.value;
  pt=i;
  i = (i>=ep.value) ? sp.value*1 : (i*1)+1 ;
 }
 
 //console.log(ip4,pt);
 data= "ip="+ip4+"&pt="+pt+"&to="+to.value;
 //console.log(data);
 ps(data);
}

function ps(a) { //send ajax req
 if (con==0){ return; }
 cc=document.getElementById("c"+i);
 if (cc) { cc.innerHTML="<font id='yel'>wait..</font>"; }
 const xhttp = new XMLHttpRequest();
 xhttp.onload = function () { recv(this) };
 xhttp.open("POST", window.location.href+chk, true);
 xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
 xhttp.send(a);
}

function recv(inc){ //revieved ajax reply
 //console.log( 'inc',inc.responseText );
 //var div = document.body;
 tmp=inc.responseText;
 d1=tmp.split(" ");
 d2=d1[0].split(".");
 //console.log(tmp,d2);
 if (d2.count==0) { d2=['','','']; }
 //con
 var gb;
 if (tmp.includes('up') || tmp.includes('op')) { gb='grn'; }
 if (tmp.includes('cl')) { gb='yel'; }
 if (tmp.includes('dn')) { gb='red'; }
 //if (gb='grn'){ pt=80; doit("192.168.15."+i) }
 zz='';
 if (d1[1]!='ping') { zz=':'+d1[1]; }
 var ht='http';
 if (d1[1]=='443') { ht='http'; }
 if (d1[1]=='21') { ht='ftp'; }
 //console.log(d1,d2);

 var out="<a href='"+ht+"://"+d1[0]+zz+"'><font id='"+gb+"'>"+d2[3]+" "+d1[1]+":"+d1[2].substr(0, 2);+"</font></a><br>";
 cc=document.getElementById("c"+i);
  if (cc) {
  cc.innerHTML=out;
 } else {
  var it=document.createElement("div");
  it.className='ch';
  it.setAttribute("id", "c"+i);
  it.innerHTML=out;
  pr.appendChild(it);
  //console.log();
 }
 if (document.getElementById("cb").checked) {
  document.getElementById("c"+i).scrollIntoView();
 }
 setTimeout( function(){ doit()},100);
}

function updt(qq){ // delay updates
 if (qq==0) {
  //ip.style.background="#440";
  updat(qq)
 } else {
  setTimeout(() => { updat(qq) }, "1000");
 }
}
function updat(qq){ // update [input id='to']
 if ( (st.value*1)<1 ) { st.value=1; }
 if ( (st.value*1)>255 ) { st.value=255; }
 if ( (ed.value*1)<1 ) { ed.value=1; }
 if ( (ed.value*1)>255 ) { ed.value=255; }
 if ( (sp.value*1)<1 ) { sp.value=1; }
 if ( (sp.value*1)>65535 ) { sp.value=65535; }
 if ( (ep.value*1)<1 ) { ep.value=1; }
 if ( (ep.value*1)>65535 ) { ep.value=65535; }
 if (to.value<0) { to.value=.1; }
 if (to.value>5) { to.value=5; }

 if (qq==0) { // check ip
  //check ip
  var rgx= /^\d{1,3}\.\d{1,3}\.\d{1,3}$/
  var tmp=rgx.test(ip.value);
  //console.log(tmp);
  if (tmp==false) {
   ip.style.background="red";
  } else {
   ip.style.background="";
  }
 }
 if (qq==1) { //check 1-254
  if ( (st.value*1)>(ed.value*1) ) { ed.value = (st.value*1); }
 }
 if (qq==2) { //check 1-254
  if ( (st.value*1)>(ed.value*1) ) { st.value = (ed.value*1); }
 }
 if (qq==3) { //check if p1 > p2
  if ( (sp.value*1)>(ep.value*1) ) { ep.value = (sp.value*1); }
 }
 if (qq==4) { //check if p2 < p1
  if ( (sp.value*1)>(ep.value*1) ) { sp.value = (ep.value*1); }
 }
 }
function stop(){ con=0; rstclr(); }
function rstclr() {
 for (var i=0;i<arr.length;i++) {
  document.getElementById(arr[i]).style.background="var(--color-main-background)";
 }
}