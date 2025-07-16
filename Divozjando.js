// CONFIGURACIÓN INICIAL 
let AMP_MIN     = 0.02;
let AMP_MAX     = 0.05;
let AMP_TRIGGER = 0.02;

let mic, fft, amp = 0;

const colores = ['#B03030', '#3A4BA0', '#D9B400', '#D97600', '#222222'];
const coloresClaritos = ['#D9B400', '#D97600'];
const coloresOscuros  = ['#B03030', '#3A4BA0', '#222222'];

let cardumen, cruz, figurasBorde, imagenesCentro;
let imagenes = [], formasSup = [];

let sonidoActivado = false;
let huboSonidoAntes = false;

let origenConjunto;

let gestorAmp, gestorGrave, gestorAgudo;


function preload() {
  for (let i = 1; i <= 8; i++) {
    imagenes.push(loadImage(`data/imagen${i}.png`));
  }
}


function setup() {
  createCanvas(600, 600);

  mic = new p5.AudioIn();
  fft = new p5.FFT(0.8, 1024);
  userStartAudio();
  mic.start();
  fft.setInput(mic);

  cardumen     = new CardumenLinea(0, height / 2, 10);
  cruz         = new Cruz(random(width*0.3, width*0.7),
                          random(height*0.3, height*0.7),
                          cardumen.lineas[0].largo,
                          random(colores));
  figurasBorde = new FigurasBorde(160, 110, 15, 10);
  imagenesCentro = new ImagenPareja(imagenes);

  formasSup.push(new FormaSup(0,    0,  60, 190, -35, '#D9B400', 20));
  formasSup.push(new FormaSup(0,   -10, 250,  55, -20, '#111111', 40));
  formasSup.push(new FormaSup(30,  40,  80,  30, -30, '#2A5C4D', 30));
  formasSup.push(new FormaSup(70,  85,  55,  85, -30, '#B03D4E', 70));
  formasSup.push(new FormaSup(100, -50, 25, 160,  45, '#E25C27',100));

  origenConjunto = {
    x: random(100, width - 200),
    y: random(100, height - 200)
  };

  for (const f of formasSup) {
    f.setOrigen(origenConjunto.x, origenConjunto.y);
  }

  gestorAmp   = new GestorSenial(0, 1);
  gestorGrave = new GestorSenial(0, 255);
  gestorAgudo = new GestorSenial(0, 255);
}


function draw() {
  background('#FFFFFF');

  amp = mic.getLevel();
  fft.analyze();
  const grave = fft.getEnergy(100, 250);
  const agudo = fft.getEnergy(300, 2000);

  gestorAmp  .actualizar(amp);
  gestorGrave.actualizar(grave);
  gestorAgudo.actualizar(agudo);

  const ampSuav   = gestorAmp.filtrada;
  const graveSuav = gestorGrave.filtrada * 255;
  const agudoSuav = gestorAgudo.filtrada * 255;

  // NUEVA CONDICIÓN
  const haySonido = ampSuav > AMP_TRIGGER || graveSuav > 30 || agudoSuav > 30;

  if (!sonidoActivado && haySonido) sonidoActivado = true;
  if (!sonidoActivado) return;

  if (haySonido && !huboSonidoAntes) {
    const paleta = agudoSuav > graveSuav ? coloresClaritos : coloresOscuros;
    figurasBorde.asignarColores(paleta);
  }
  huboSonidoAntes = haySonido;

  cardumen.actualizar(ampSuav, graveSuav, agudoSuav);
  cardumen.dibujar();

  figurasBorde.dibujar();
  imagenesCentro.dibujar(ampSuav, AMP_MIN, AMP_MAX);
  cruz.actualizar(haySonido);
  cruz.dibujar();

  for (const f of formasSup) {
    f.actualizarPosicion(cardumen.t, ampSuav);
    f.dibujar();
  }
}


class GestorSenial {
  constructor(min, max) { this.min=min; this.max=max; this.f=0.8; this.filtrada=0;}
  actualizar(v) {
    const m = constrain(map(v, this.min, this.max, 0, 1), 0, 1);
    this.filtrada = this.f * this.filtrada + (1-this.f)*m;
  }
}


class CardumenLinea {
  constructor(x, y, n) {
    this.x=x; this.y=y; this.t=0;
    this.lineas = [];
    for (let i=0;i<n;i++) this.lineas.push(new Linea(i*25, random(-20,20), random(colores)));
  }
  actualizar(amp, grave, agudo) {
    this.t+=0.05;
    if (amp<AMP_MIN) return;
    const ang = agudo>grave ? radians(30) : radians(-30);
    const vel = map(max(grave,agudo),0,255,1,6);
    this.x+=cos(ang)*vel; this.y+=sin(ang)*vel;
    if (this.x>width+10||this.y<-10||this.y>height+10){this.x=-50;this.y=height/2;}
  }
  dibujar(){ for(const l of this.lineas){l.actualizarPosicion(this.x,this.y,this.t);l.dibujar();} }
}
class Linea{
  constructor(offX,offY,col){this.offX=offX;this.offY=offY;this.largo=120;this.color=col;this.displayX=offX;this.displayY=offY;}
  actualizarPosicion(cx,cy,t){this.displayX=cx+this.offX;this.displayY=cy+this.offY+sin(t+this.offX*0.3)*10;}
  dibujar(){stroke(this.color);strokeWeight(5);strokeCap(SQUARE);line(this.displayX,this.displayY,this.displayX+this.largo,this.displayY);}
}


class Cruz {
  constructor(x, y, d, col) {
    this.x = x;
    this.y = y;
    this.d = d;
    this.col = col;
    this.l1 = d * 3;
    this.l2 = d * 0.05;
    this.gw = d * 0.6;
    this.gh = d * 0.08;
    this.rot = random(TWO_PI);
  }

  actualizar(haySonido) {
    if (haySonido) {
      this.rot += 0.02;
    }
  }

  dibujar() {
    push();
    translate(this.x, this.y);
    rotate(this.rot);
    noStroke();
    fill(this.col);
    rectMode(CENTER);
    rect(0, this.l1 / 2 - 10, this.l2, this.l1);
    rect(0, 0, this.gw, this.gh);
    pop();
  }
}


class FigurasBorde{
  constructor(tCirc,tCuad,esp,mar){
    this.tCirc=tCirc; this.r=tCirc/2; this.colCirc=random(colores);
    const bordes=['arriba','abajo','izquierda','derecha'];
    this.side=random(bordes);
    const off=this.r*0.3;
    if(this.side==='arriba' ){this.xCirc=random(this.r,width-this.r);this.yCirc=-off;}
    if(this.side==='abajo'  ){this.xCirc=random(this.r,width-this.r);this.yCirc=height+off;}
    if(this.side==='izquierda'){this.xCirc=-off;this.yCirc=random(this.r,height-this.r);}
    if(this.side==='derecha'){this.xCirc=width+off;this.yCirc=random(this.r,height-this.r);}
    const esquinas={arriba:['infIzq','infDer'],abajo:['supIzq','supDer'],izquierda:['supDer','infDer'],derecha:['supIzq','infIzq']};
    const esquina=random(esquinas[this.side]);
    let x0,y0;if(esquina==='supIzq'){x0=mar;y0=mar;}
    else if(esquina==='supDer'){x0=width-(tCuad*2+esp)-mar;y0=mar;}
    else if(esquina==='infIzq'){x0=mar;y0=height-tCuad-mar;}
    else{x0=width-(tCuad*2+esp)-mar;y0=height-tCuad-mar;}
    this.cuadrados=[{x:x0,y:y0,t:tCuad,col:random(colores)},
                   {x:x0+tCuad+esp,y:y0,t:tCuad,col:random(colores)}];
  }
  asignarColores(paleta){
    this.colCirc=random(paleta);
    for(const c of this.cuadrados) c.col=random(paleta);
  }
  dibujar(){
    for(const c of this.cuadrados){noStroke();fill(c.col);rect(c.x,c.y,c.t);}
    noStroke();fill(this.colCirc);ellipse(this.xCirc,this.yCirc,this.tCirc);
  }
}


class ImagenPareja{
  constructor(imgs){this.imgs=imgs;this.i1=floor(random(imgs.length));do{this.i2=floor(random(imgs.length));}while(this.i2===this.i1);this.h=0;}
  dibujar(amp,aMin,aMax){
    const escW=0.2,d=map(amp,aMin,aMax,0.2,1.4,true);
    const w=this.imgs[0].width*escW,hTar=this.imgs[0].height*constrain(d,0.2,height/this.imgs[0].height);
    this.h=lerp(this.h,hTar,0.1);
    const sep=-10,posX=width/2-(w*2+sep)/2,posY=height/2-this.h/2;
    push();translate(posX+w*0.5,posY+this.h*0.5);rotate(radians(-10));image(this.imgs[this.i1],-w/2,-this.h/2,w,this.h);pop();
    push();translate(posX+w*1.5+sep,posY+this.h*0.5);rotate(radians(-10));image(this.imgs[this.i2],-w/2,-this.h/2,w,this.h);pop();
  }
}


class FormaSup {
  constructor(offX, offY, w, h, rot, col, offMov) {
    this.offX = offX;
    this.offY = offY;
    this.w = w;
    this.h = h;
    this.rot = rot;
    this.col = col;
    this.offMov = offMov;
    this.x = 0;
    this.y = 0;
    this.origenX = 0;
    this.origenY = 0;
  }

  setOrigen(x, y) {
    this.origenX = x;
    this.origenY = y;
  }

  actualizarPosicion(t, ampSuav) {
    const maxDes = 200;
    const desAmp = map(ampSuav, AMP_MIN, AMP_MAX, maxDes, -maxDes, true);
    const tx = this.origenX + this.offX;
    const ty = this.origenY + this.offY + desAmp + sin(t + this.offMov * 0.03) * 10;
    this.x = lerp(this.x, tx, 0.1);
    this.y = lerp(this.y, ty, 0.1);
  }

  dibujar() {
    push();
    translate(this.x, this.y);
    rotate(radians(this.rot));
    rectMode(CENTER);
    noStroke();
    fill(this.col);
    rect(0, 0, this.w, this.h);
    pop();
  }
}
