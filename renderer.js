const button = document.getElementById('button')

button.addEventListener('click', async () => {
    const username = document.getElementById('username').value
    const password = document.getElementById('password').value
    const success = await window.electronAPI.login(username, password)
    document.getElementById("success").innerHTML = success
});