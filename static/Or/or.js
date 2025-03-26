const buttons = document.querySelectorAll('.color-button');

buttons.forEach((button) => {
  button.addEventListener('mousemove', (event) => {
    const buttonRect = button.getBoundingClientRect();
    const mouseX = event.clientX - buttonRect.left;

    if (mouseX < buttonRect.width / 2) {
      button.classList.add('left-hover');
      button.classList.remove('right-hover');
    } else {
      button.classList.add('right-hover');
      button.classList.remove('left-hover');
    }
  }); 

  button.addEventListener('mouseleave', () => {
    button.classList.remove('left-hover', 'right-hover');
  });
});
