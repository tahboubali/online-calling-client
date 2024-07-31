<script lang="ts">
type User = {
  username: string
  currentImageURL: string
}

type UserInfo = {
  username: string
}

type CallData = {
  curr_frame: string
  image_format: string
}

type Data = {
  users: { [username: string]: User }
  user: User
  ws: WebSocket | null
  worker: Worker | null
}

type SuccessError = {
  response_type: "success" | "error"
  code: 200 | 500 | 400
  message: string
}

type Message = {
  request_type?: string
  response_type?: string
  username?: string
  user_info?: UserInfo
  call_data?: CallData
}

export default {
  name: "Call",
  data(): Data {
    return {
      users: {},
      user: {} as User,
      ws: null,
      worker: null
    }
  },
  methods: {
    setWebSocket(ws: WebSocket) {
      this.ws = ws
    },
    validateWS(): WebSocket {
      if (this.ws == null || this.ws.readyState !== WebSocket.OPEN)
        throw new Error("Websocket is not open")
      return this.ws as WebSocket
    },
    async makeRequest(request: Message): Promise<SuccessError> {
      const ws = this.validateWS()
      try {
        return await new Promise((resolve, reject) => {
          const handleError = (event: Event) => {
            reject(event)
            console.error(event)
            ws.removeEventListener("error", handleError)
            ws.removeEventListener("message", handleMessage)
          }

          const handleMessage = (event: MessageEvent) => {
            const message = JSON.parse(event.data) as SuccessError
            console.log(message)
            if (message.code === 200) {
              resolve(message)
            } else {
              reject(message.message)
            }
            ws.removeEventListener("error", handleError)
            ws.removeEventListener("message", handleMessage)
          }

          ws.send(JSON.stringify(request))

          ws.addEventListener("error", handleError)
          ws.addEventListener("message", handleMessage)
        })
      } catch (e) {
        // alert(`Could not complete request: ${e}`)
        console.error(`Could not complete request: ${e}`)
        throw e
      }
    },
    async sendCreateUser(username: string) {
      await this.makeRequest({
        request_type: "create-user",
        user_info: {
          username: username
        },
      })
    },
    async sendDeleteUser(username: string) {
      await this.makeRequest({
        request_type: "delete-user",
        username: username
      })
    },
    async sendUpdateUser(username: string, userInfo: UserInfo) {
      await this.makeRequest({
        request_type: "update-user",
        username: username,
        user_info: userInfo
      })
    },
    async sendCallUpdate(callData: CallData) {
      await this.makeRequest({
        request_type: "call-update",
        call_data: callData
      })
    },
    async initializeWebSocket() {
      const POLLING_RATE_MILLIS = 1000;
      let ws: WebSocket;

      const waitForOpenConnection = () => {
        return new Promise((resolve) => {
          const checkIsOpen = () => {
            if (ws.readyState === WebSocket.OPEN) {
              resolve("Connection opened successfully.");
            } else {
              setTimeout(checkIsOpen, 100);
            }
          };
          checkIsOpen();
        });
      };

      const tryInitialize = async () => {
        ws = new WebSocket("ws://localhost:8080/ws");
        ws.onopen = async () => {
          this.setWebSocket(ws);
          console.log(await waitForOpenConnection());
          await this.sendInitWebSocketMessages();
        };

        ws.onclose = () => {
          console.log("WebSocket connection closed.");
          setTimeout(() => {
            tryInitialize();
          }, POLLING_RATE_MILLIS);
        };

        ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        ws.onerror = (event) => {
          console.error("WebSocket error:", event);
          ws.close();
        };
      };

      await tryInitialize();
    },
    handleMessage(data: string) {
      console.log("RECIEVED NEW MESSAGE:", data);
      const message = JSON.parse(data) as Message;
      switch (message.response_type) {
        case "create-user": {
          const user = {
            username: (message.user_info as UserInfo).username,
            currentImageURL: ''
          } as User;
          this.users[user.username] = user;
          break;
        }
        case "delete-user": {
          const username = message.username as string;
          delete this.users[username];
          break;
        }
        case "update-user": {
          const username = message.username as string;
          const userInfo = message.user_info as UserInfo;
          const currentImageURL = this.users[username].currentImageURL;
          this.users[username] = {
            username: userInfo.username,
            currentImageURL: currentImageURL
          }
          break;
        }
        case "call-update": {
          const user = this.users[message.username as string] as User;
          const callData = message.call_data as CallData;
          if (user.currentImageURL) URL.revokeObjectURL(user.currentImageURL);
          user.currentImageURL = URL.createObjectURL(new Blob([this.base64ToUint8Array(callData.curr_frame)], { type: "image/jpeg" }));
          break;
        }
      }
    },
    async fetchUsers() {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN)
        throw new Error("WebSocket is not open");

      const ws = this.ws as WebSocket;

      const users = await new Promise((resolve, reject) => {
        const handleMessage = (event: MessageEvent) => {
          resolve(JSON.parse(event.data));
          ws.removeEventListener("message", handleMessage)
          ws.removeEventListener("error", handleError)
        }

        const handleError = (event: Event) => {
          reject(event);
          ws.removeEventListener("message", handleMessage)
          ws.removeEventListener("error", handleError)
        }

        ws.send(JSON.stringify({
          request_type: "get-users"
        }));

        ws.addEventListener("message", handleMessage);
        ws.addEventListener("error", handleError);
      });

      this.users = users as { [username: string]: User };
    },
    async initializeVideoFeed() {
      const video = this.$refs.video as HTMLVideoElement
      const stream = await navigator.mediaDevices.getUserMedia({video: {aspectRatio: 16 / 9}})
      video.srcObject = stream as MediaStream;
      await video.play();
      this.captureFrames()
    },
    uint8ArrayToBase64(uint8Array: Uint8Array): string {
      let binary = '';
      const len = uint8Array.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      return btoa(binary);
    },
    base64ToUint8Array(base64: string): Uint8Array {
      const bString = atob(base64)
      const uint8 = new Uint8Array(base64.length);
      for (let i = 0; i < bString.length; i++)
        uint8[i] = bString.charCodeAt(i);
      return uint8;
    },
    captureFrames() {
      const video = this.$refs.video as HTMLVideoElement;
      const canvas = this.$refs.canvas as HTMLCanvasElement;
      const captureFrame = () => {
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => {
            if (!blob)
              throw new Error("Blob is null")
            blob.arrayBuffer().then(currFrame => {
                  const uint8 = new Uint8Array(currFrame);
                  if (uint8) {
                    this.sendCallUpdate({
                      image_format: "image/jpeg",
                      curr_frame: this.uint8ArrayToBase64(uint8)
                    })
                  }
                }
            )
          }, "image/jpeg", .2)
        }
        setTimeout(() => {
          requestAnimationFrame(captureFrame);
        }, 80)
      };
      captureFrame();
    },
    async sendInitWebSocketMessages() {
      await this.sendCreateUser(this.getUsername);
      await this.fetchUsers();
    },
    async initialize() {
      this.user.username = this.getUsername;
      await this.initializeWebSocket();
      await this.initializeVideoFeed();
    }
  },
  computed: {
    getUsername(): string {
      return this.$store.getters.getUsername
    }
  },
  mounted() {
    this.initialize()
  },
}
</script>

<template>
  <h1>{{ user.username }}</h1>
  <video width="500" ref="video" autoplay></video>
  <button ref="startStop"></button>
  <canvas width="700" height="393" style="display: none" ref="canvas"></canvas>
  <div class="container">
    <div id="user-container" v-for="user in Object.values(users)" :key="user.username">
      <h2 id="username">{{ user.username }}</h2>
      <img :src="user.currentImageURL" :alt="user.username">
    </div>
  </div>
</template>

<style scoped lang="scss">
video {
  border-radius: 20px;
}

#user-container {
  background: whitesmoke;
  border-radius: 20px;
  max-width: 730px;
  max-height: 468px;
  justify-content: center;
}

#username {
  margin: 10px
}

img {
  margin: 10px;
  border-radius: 20px;
}
</style>