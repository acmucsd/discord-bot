const fs = require('fs')
const { loadImage, createCanvas } = require('canvas')
const slide = createCanvas(1920, 1080);
const context = slide.getContext('2d');
context.fillStyle = "#ffffff";
context.fillRect(0, 0, 1920, 1080);

// loadImage('./src/assets/acm-qr-logo.png').then((image) => {
//   context.drawImage(image, 500, 500, 500, 500);

//   const imgBuffer = slide.toBuffer('image/png')
//   fs.writeFileSync('./drawnImage.png', imgBuffer)
// });

const angleInRadians = Math.PI / 4;
context.rotate(-1 * angleInRadians);
loadImage('./src/assets/acm-qr-logo.png').then((image) => {
    context.drawImage(image, 200, 500, 800, 800);
    context.rotate(angleInRadians);

    const imgBuffer = slide.toBuffer('image/png')
    fs.writeFileSync('./drawnImage.png', imgBuffer)
});

/** 
const width = 1200
const height = 650
const canvas = createCanvas(width, height)
const context = canvas.getContext('2d')
context.fillStyle = '#2b03a3'
context.fillRect(0, 0, width, height)
context.font = 'bold 72pt Menlo'
context.textBaseline = 'top'
context.textAlign = 'center'
context.fillStyle = '#f7ab07'
const imgText = 'Tiny Text on Canvas'
const textAlign = context.measureText(imgText).width
context.fillRect(590 - textAlign / 2 - 10, 170 - 5, textAlign + 20, 120)
context.fillStyle = '#ffffff'
context.fillText(imgText, 555, 120)
context.fillStyle = '#ffffff'
context.font = 'bold 32pt Menlo'
context.fillText('positronx.io', 755, 600)

loadImage("data:image/gif;base64,R0lGODlhCwALAIAAAAAA3pn/ZiH5BAEAAAEALAAAAAALAAsAAAIUhA+hkcuO4lmNVindo7qyrIXiGBYAOw==").then((data) => {
  context.drawImage(data, 340, 515, 70, 70)
  const imgBuffer = canvas.toBuffer('image/png')
  fs.writeFileSync('./drawnImage.png', imgBuffer)
})*/