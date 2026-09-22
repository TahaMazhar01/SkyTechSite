const slides = [
 {image:'abu-dhabi.jpg',alt:'Etihad Towers in Abu Dhabi',label:'Your local technology partner',title:'Better connected.<br>Better protected.',accent:'Right here in Abu Dhabi.',copy:'Reliable Wi-Fi, smarter security, and expert installation. Bring your home and business technology together with SKY TECH.',link:'#services',cta:'Discover our services',name:'Abu Dhabi'},
 {image:'router.jpg',alt:'Wireless router on a desk',label:'Wi-Fi & networking',title:'Every room.<br>Every connection.',accent:'A stronger everyday.',copy:'From home Wi-Fi to office networks, find the right routers, access points, and coverage plan for your space.',link:'#shop',cta:'Explore networking',name:'Connected spaces'},
 {image:'outdoor-camera.jpg',alt:'Security camera mounted on an exterior wall',label:'CCTV & security',title:'Keep an eye on<br>what matters.',accent:'Wherever you are.',copy:'Plan your camera coverage, recording, and mobile viewing with equipment and installation tailored to your property.',link:'#services',cta:'Explore security',name:'Smarter security'},
 {image:'home-control.jpg',alt:'Person using a home automation control panel',label:'Smart home solutions',title:'Your home.<br>Working together.',accent:'Simple. Connected. Smart.',copy:'Make everyday routines easier with compatible smart devices, thoughtful configuration, and a walkthrough of your setup.',link:'#shop',cta:'Explore smart living',name:'Smart living'},
 {image:'hero-installation.jpg',alt:'Engineer connecting a cable to network equipment',label:'Professional installation & support',title:'Built with care.<br>Connected with confidence.',accent:'From setup to support.',copy:'Structured cabling, organized racks, and practical IT support. Get a reliable foundation for your next connection.',link:'#contact',cta:'Talk to our team',name:'Expert installation'}
];

export function mountHero(){
 const hero=document.querySelector('.hero');
 hero.classList.add('hero-carousel');
 hero.setAttribute('role','region');hero.setAttribute('aria-roledescription','carousel');hero.setAttribute('aria-label','SKY TECH services');
 hero.innerHTML=`<div class="hero-slides">${slides.map((s,i)=>`<article class="hero-slide ${i===0?'is-active':''}" role="group" aria-roledescription="slide" aria-label="${i+1} of ${slides.length}: ${s.name}" ${i?'aria-hidden="true" inert':''}>
 <img class="hero-image" src="/assets/${s.image}" alt="${s.alt}" ${i===0?'fetchpriority="high"':'loading="eager"'} decoding="async"/><div class="hero-shade"></div>
 <div class="container hero-content"><div class="eyebrow light"><span></span>${s.label}</div><${i===0?'h1':'h2'} class="slide-heading">${s.title}<br><span>${s.accent}</span></${i===0?'h1':'h2'}><p>${s.copy}</p><div class="hero-buttons"><button class="button primary" data-book>Book a consultation <span aria-hidden="true">↗</span></button><a class="button glass" href="${s.link}">${s.cta} <span aria-hidden="true">→</span></a></div><div class="hero-note">Local expertise <span>•</span> Professional installation <span>•</span> Ongoing support</div></div></article>`).join('')}</div>
 `;
 let current=0,timer;
 const panels=[...hero.querySelectorAll('.hero-slide')];
 function showNext(){
  current=(current+1)%panels.length;
  panels.forEach((panel,index)=>{
   const active=index===current;
   panel.classList.toggle('is-active',active);
   panel.inert=!active;
   panel.setAttribute('aria-hidden',String(!active));
  });
 }
 function start(){
  clearInterval(timer);
  if(!document.hidden)timer=setInterval(showNext,5000);
 }
 document.addEventListener('visibilitychange',start);
 start();
}