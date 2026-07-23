let password = document.querySelector('#password');
let confirmPassword = document.querySelector('#confirmPassword');
let message = document.querySelector('#passwordMessage');

function checkPassword(){
    if (
        confirmPassword.value !== "" && 
        password.value !== confirmPassword.value
    ) {
        message.classList.remove("d-none");
    } else {
        message.classList.add("d-none");
    }
}

password.addEventListener("input", checkPassword);
confirmPassword.addEventListener("input", checkPassword);