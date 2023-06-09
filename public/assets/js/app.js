function getCookie(name) {
    const cookieArr = document.cookie.split(";");
    for (let i = 0; i < cookieArr.length; i++) {
        let cookiePair = cookieArr[i].split("=");
        if (name === cookiePair[0].trim()) {
            return decodeURIComponent(cookiePair[1]);
        }
    }

    return null;
}

const setConnectivityStatus = function (status) {
    const elConnectivityStatus = document.getElementById('connectivity-status')
    switch (status) {
        case 'connecting':
        case 'reconnecting':
            elConnectivityStatus.innerHTML = `
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span class="text-primary">${status}</span>
                `
            break;
        case 'connected':
            elConnectivityStatus.innerHTML = `<span class="badge text-bg-success">connected</span>`
            break;
        case 'error':
        case 'disconnected':
            elConnectivityStatus.innerHTML = `<span class="badge text-bg-danger">${status}</span>`
            break;
    }
}

const setTypingStatus = function (status, username, connId) {
    const elTypingStatus = document.getElementById(`typing-status-${connId}`)

    if (!elTypingStatus) return;

    switch (status) {
        case 'typing':
            elTypingStatus.style.display = 'block';
            break;
        case 'stop':
            elTypingStatus.style.display = 'none';
    }
}

const addUserToTab = function (sid, name) {
    const el = document.createElement('div')
    el.classList.add('list-group-item', 'me-2')
    el.id = `sid-${sid}`
    el.innerHTML = `
        <div class="row">
            <div class="col-md-1">
                <img style="height: 25px; width: 25px" src="/assets/images/gender-neutral-avatar.jpg" alt="" class="">
            </div>
            <div class="col-md-8" style="margin-top: 2px">
                ${name}
                <div>
                    <small  id="typing-status-${sid}" class="text-success" style="display: none">typing...</small>
                </div>
            </div>
        </div>
    `

    document.getElementById('connection-list').appendChild(el)
}

const refreshConnectionList = function () {
    document.getElementById('connection-list').innerHTML = ''
}

const processMessage = function (event, customMessage = null) {
    const user_name = event.meta.user_info
        ? event.meta.user_info.username
        : (customMessage ? '' : 'You');

    if (customMessage) {
        event.data.message = makeMessage(user_name, customMessage, true)
    } else {
        event.data.message = makeMessage(user_name, event.data.message)
    }

    displayMessage(event)
}

const displayMessage = function (event) {
    const containerMessages = document.getElementById('messages-container')
    const elChatMessages = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.innerHTML = event.data.message;
    elChatMessages.append(div)

    containerMessages.scroll(0, containerMessages.scrollHeight);
}

const makeMessage = function (user, message, isSystemMessage = false) {
    const date = new Date();
    const body = isSystemMessage
        ? `<i>${user} ${message}</i>`
        : `<div class="fw-bold">${user}</div>
                      ${message}`

    return `
                <div class="list-group-item d-flex justify-content-between align-items-start mb-1">
                    <div class="ms-2 me-auto">
                      ${body}
                    </div>
                    <small class="fst-italic">${date.toLocaleTimeString()} ${date.toLocaleDateString()}</small>
                </div>
            `
}

const initRoom = function (roomName) {
    setConnectivityStatus('connecting');

    document.getElementById('connection-list').style.height = ((window.outerHeight / 100) * 50) + 'px'
    document.getElementById('messages-container').style.height = ((window.outerHeight / 100) * 50) + 'px'

    const websocket = RTC_Websocket.create(`${getCookie('ws_client_url')}/ws/chat`, [], {
        username: document.querySelector('input[name="username"]').value
    });

    const room = websocket.joinRoom(roomName)
    const universal = websocket.joinRoom('universal')
    let connections = {}
    let my_sid;

    websocket.onOpen(() => {
        setConnectivityStatus('connected')
        console.log('ws connection opened')
    });

    websocket.onReconnecting(() => {
        setConnectivityStatus('reconnecting')
        console.log('recovering ws connection...')
    });

    websocket.onClose(() => {
        console.log('ws connection closed')
        setConnectivityStatus('disconnected')
    });

    websocket.onEvent('welcome', e => {
        my_sid = e.data.sid
    })

    websocket.onMessage(event => {
        if (event.event === 'typing') {
            return;
        }

        console.log(event)
    });

    websocket.onEvent('aloha', e => {
        processMessage(e, e.data.message)
    });

    room.onJoined(e => {
        processMessage(e, 'room joined successfully')
        refreshConnectionList()
        room.send('room_list_connections', [])
    });

    room.onUserJoined(e => {
        addUserToTab(e.meta.user_sid, e.meta.user_info.username)
        processMessage(e, 'joined this room')
    });

    room.onUserLeft(e => {
        processMessage(e, 'left this room')
        document.getElementById(`sid-${e.meta.user_sid}`)?.remove()
    });

    websocket.onEvent('room_connections', e => {
        for (const sid in e.data) {
            if (parseInt(sid) !== my_sid) {
                const conn = connections[sid] = JSON.parse(e.data[sid])
                addUserToTab(sid, conn.username)
            }
        }
    })

    room.on('typing', function (event) {
        setTypingStatus('stop', null, event.sender.id)
        setTypingStatus('typing', event.sender.info.username, event.sender.id)
        setTimeout(() => setTypingStatus('stop', null, event.sender.id), 1000)
    });

    room.onMessage(function (event) {
        const user_name = event.sender.info
            ? event.sender.info.username
            : 'You';

        event.data.message = makeMessage(user_name, event.data.message)
        displayMessage(event)
    });

    room.on('conn.rejected', () => {
        room.close()
    });

    document.getElementById('block-room').style.display = 'none'
    document.getElementById('block-message').style.display = 'block'

    document.getElementById('message').oninput = function (e) {
        room.send('typing', '')
    }

    document.getElementById('form-send-message').onsubmit = function (e) {
        e.preventDefault();
        const textarea = this.querySelector('textarea')
        const message = textarea.value
        textarea.value = ''

        room.sendMessage({message});
    }
}

document.getElementById('form-choose-room').onsubmit = function (e) {
    e.preventDefault();
    const input = this.querySelector('input[name="room"]')
    initRoom(input.value)
}

