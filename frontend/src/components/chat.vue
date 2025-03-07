<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
// @ts-ignore
import VueMarkdownIt from "vue3-markdown-it";

const messages = ref<{ role: string; content: string }[]>([]);
const userInput = ref("");
const loading = ref(false);
const chatContainer = ref<HTMLElement | null>(null);
const history = ref<{ id: string; title: string }[]>([]);
const currentChatId = ref("");
const inputRef = ref<HTMLTextAreaElement | null>(null); 

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

// 读取本地历史记录
const loadHistory = () => {
  const savedHistory = localStorage.getItem("chatHistory");
  if (savedHistory) {
    history.value = JSON.parse(savedHistory);
    console.log(111, history.value)
  }
};

// 存储历史记录
const saveHistory = () => {
  localStorage.setItem("chatHistory", JSON.stringify(history.value));
};

// 加载旧会话
const loadChat = (chatId: string) => {
  const savedMessages = localStorage.getItem(`chat_${chatId}`);
  console.log(111, savedMessages)
  if (savedMessages) {
    messages.value = JSON.parse(savedMessages);
    currentChatId.value = chatId;
  }
};

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim()) return;

  if (!currentChatId.value) {
    currentChatId.value = Date.now().toString();
    history.value.push({ id: currentChatId.value, title: userInput.value });
    saveHistory();
  }

  messages.value.push({ role: "user", content: userInput.value });
  const userMessage = userInput.value;

  // **清空输入框**
  userInput.value = "";
  if (inputRef.value) {
    inputRef.value.innerHTML = "";
    inputRef.value.style.height = "40px"; // 重置高度
  }

  loading.value = true;

  await nextTick();
  scrollToBottom();

  try {
    const response = await fetch("http://localhost:3000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = "";
    let assistantIndex = messages.value.length;

    messages.value.push({ role: "assistant", content: "" });

    const processChunk = async () => {
      while (true) {
        const { value, done } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              loading.value = false;
              localStorage.setItem(`chat_${currentChatId.value}`, JSON.stringify(messages.value));
              return;
            }
            assistantMessage += data;
            messages.value[assistantIndex].content = assistantMessage;

            await nextTick();
            scrollToBottom();
          }
        }
      }
    };

    processChunk();
  } catch (error) {
    console.error("Error:", error);
  } finally {
    loading.value = false;
  }
};

// 监听输入框快捷键
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

// 监听输入框内容变化，自动调整高度
const handleInput = () => {
  if (inputRef.value) {
    userInput.value = inputRef.value.innerText; // 获取 div 的文本内容
    inputRef.value.style.height = "auto";
    inputRef.value.style.height = `${Math.min(inputRef.value.scrollHeight, 120)}px`; // 限制最大高度 4 行
  }
};

// 开启新会话
const newChat = () => {
  messages.value = [];
  currentChatId.value = "";
};

onMounted(() => {
  loadHistory();
});
</script>

<template>
  <div class="flex h-screen">
    <!-- 左侧 Sidebar -->
    <div class="w-1/4 bg-gray-100 p-4 border-r">
      <h2 class="text-lg font-bold mb-2">历史记录</h2>
      <ul>
        <li
          v-for="chat in history"
          :key="chat.id"
          class="p-2 cursor-pointer hover:bg-gray-200 rounded"
          @click="loadChat(chat.id)"
        >
          {{ chat.title }}
        </li>
      </ul>
      <NButton type="info" block @click="newChat" class="mt-2 p-2 w-full bg-red-500 text-white rounded">新会话</NButton>
    </div>

    <!-- 右侧 Chat -->
    <div class="flex-1 p-4 flex flex-col">
      <!-- 聊天记录 -->
      <div ref="chatContainer" class="flex-1 overflow-y-auto border rounded p-4">
        <div v-for="(msg, index) in messages" :key="index" class="mb-4">
          <p class="font-bold" :class="{ 'text-blue-500': msg.role === 'user', 'text-green-500': msg.role === 'assistant' }">
            {{ msg.role === 'user' ? '你' : 'DeepSeek' }}:
          </p>
          <vue-markdown-it :source="msg.content" />
        </div>
      </div>

      <!-- 输入框 -->
      <!-- <div class="mt-4 flex gap-2">
        <input v-model="userInput" type="text" class="border flex-1 p-2 rounded" placeholder="输入消息..." @keyup.enter="sendMessage" />
        <NButton type="primary" :loading="loading" class="ml-2 px-4 py-2 disabled:opacity-50" @click="sendMessage">发送</NButton>
      </div> -->
      <!-- 输入框 -->
      <div class="bg-white p-3 flex flex-col items-center relative border rounded-lg mt-[20px] gap-[10px] pb-[50px]">
        <div class="w-full">
          <div
            ref="inputRef"
            contenteditable="true"
            role="textbox"
            aria-multiline="true"
            class="flex-1 rounded-lg focus:outline-none overflow-hidden min-h-[40px] max-h-[220px]"
            style="word-break: break-word; overflow-y: auto;"
            @keydown="handleKeydown"
            @input="handleInput"
          ></div>
        </div>
        <div class=" absolute right-3 bottom-3">
          <!-- 发送按钮 -->
          <NButton type="primary" :loading="loading" :disabled="loading || !userInput.trim()" class="absolute right-0" @click="sendMessage">发送</NButton>
        </div>

        <!-- <button
          @click="sendMessage"
          :disabled="loading || !userInput.trim()"
          class="absolute right-4 bottom-3 bg-blue-500 text-white px-3 py-1 rounded-lg disabled:opacity-50"
        >
          发送
        </button> -->
      </div>
    </div>
  </div>
</template>
