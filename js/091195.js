var myVar;
var isCliked = false;
var time = 3;
var elem = [];
var face = [];
chance = 0;
pot = 0;
jPot = document.getElementById("jackpot");
jPot.innerHTML = "JackPot: $" + pot + "!";
showmsg = document.getElementById("msg");
credit = document.getElementById("cred");

var audio = [];
var j;
for (j = 0; j < 5; j++) {
  audio[j] = document.getElementById("audio" + [j]);

}

//var inicio = testa();

function coinPay(a) {
  chance += a;
  audio[2].play();
  credit.innerHTML = chance + " credits!";
  alert("You've received $" + a + " credits!");
};
function testa() {
  credit.innerHTML = "You got " + chance.toFixed(2) + " credits!";
  var btn = document.getElementById("btn");
  if (isCliked == true) {
    btn.style.backgroundColor = "red";
    btn.disabled = false;
    clearTimeout(myVar);
    linha = setLinha();
    audio[0].pause();
    isCliked = false;
  } else {
    if (chance <= 0) {
      chance = 0;
      audio[4].play();
      showmsg.innerHTML = "GAME OVER!";
      credit.innerHTML = "You got " + chance.toFixed(2) + " credits!";
      alert("Insert credits!");
    } else {
      btn.style.backgroundColor = "grey";
      btn.disabled = true;
      audio[4].pause();
      let jg = Game();
      let setPrize = flipPrize();
      audio[0].play();
      isCliked = true;
      temp = setTime();
    }
  }

};
function setPot() {
  pot += chance / 100;
  more = chance / 100;
  jPot.innerHTML = "JackPot: $" + pot.toFixed(2) + "!";
  credit.innerHTML = "You got " + chance.toFixed(2) + " credits!";
  showmsg.innerHTML = "Added more $ " + more.toFixed(2);
  audio[3].play();
};
function showFigure(figure) {
  if (faceP == figure) {
    chance += pot * 4;
    alert("JackPot! You just got a bonus of " + (pot * 4).toFixed(2) + " credits!");
    pot = 0;
  } else {

    if (figure == 0) {
      chance += 5;
    } else {
      chance += figure * 10;
    }

  }
};
var faces = ['star', 'seven', 'spade', 'aple', 'bell', 'jota', 'queen', 'king', 'bar'];

function flipPrize() {
  elemPrize = document.getElementById("Prize");
  faceP = Math.floor(Math.random() * 9);
  elemPrize.src = "https://raw.githubusercontent.com/jpcruz6000/Ca-a-Niquel/master/" + faces[faceP] + ".png";
};
function Game() {

  var i;

  for (i = 0; i < 9; i++) {
    face[i] = Math.floor(Math.random() * 9);
    elem[i] = document.getElementById("myimg" + [i]);
    elem[i].src = "https://raw.githubusercontent.com/jpcruz6000/Ca-a-Niquel/master/" + faces[face[i]] + ".png";
    elem[i].style.borderRadius = "50%";
    elem[i].style.boxShadow = "none";
    elem[i].style.animationIterationCount = "1";

  }

  myVar = setTimeout(Game, 200);

};
function setTime() {
  var cronometro = setInterval(function () {

    time -= 1;

    if (time < 0) {
      clearInterval(cronometro);
      test = testa();
    }
  }, 1000);

};

function setLinha() {
  if (face[0] == face[1] && face[1] == face[2] || face[3] == face[4] && face[4] == face[5] ||
  face[6] == face[7] && face[7] == face[8] || face[0] == face[3] && face[3] == face[6] ||
  face[1] == face[4] && face[4] == face[7] || face[2] == face[5] && face[5] == face[8] ||
  face[0] == face[4] && face[4] == face[8] || face[2] == face[4] && face[4] == face[6]) {
    if (face[0] == face[1] && face[1] == face[2]) {
      let show = showLinha(0, 1, 2);
    }
    if (face[3] == face[4] && face[4] == face[5]) {
      let show = showLinha(3, 4, 5);
    }
    if (face[6] == face[7] && face[7] == face[8]) {
      let show = showLinha(6, 7, 8);
    }
    if (face[0] == face[3] && face[3] == face[6]) {
      let show = showLinha(0, 3, 6);
    }
    if (face[1] == face[4] && face[4] == face[7]) {
      let show = showLinha(1, 4, 7);
    }
    if (face[2] == face[5] && face[5] == face[8]) {
      let show = showLinha(2, 5, 8);
    }
    if (face[0] == face[4] && face[4] == face[8]) {
      let show = showLinha(0, 4, 8);
    }
    if (face[2] == face[4] && face[4] == face[6]) {
      let show = showLinha(2, 4, 6);
    }
  } else {
    chance -= 5;
    credit.innerHTML = "You got " + chance.toFixed(2) + " credits!";
    showmsg.innerHTML = "Good Luck!";
    audio[1].play();
  }
};

function showLinha(val1, val2, val3) {
  elem[val1].style.boxShadow = "0 0 4px 2px rgba(0, 140, 186, 0.5)";
  elem[val2].style.boxShadow = "0 0 4px 2px rgba(0, 140, 186, 0.5)";
  elem[val3].style.boxShadow = "0 0 4px 2px rgba(0, 140, 186, 0.5)";
  elem[val1].style.animation = "anima 750ms ease infinite";
  elem[val2].style.animation = "anima 750ms ease infinite";
  elem[val3].style.animation = "anima 750ms ease infinite";
  let fig = showFigure(face[val1]);
  let pots = setPot();
};
