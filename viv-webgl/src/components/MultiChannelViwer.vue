<script setup>
import { ref, onMounted } from "vue";
import { Viewer } from "@vivjs/viewers";
import { MultiscaleImageLayer } from "@vivjs/layers";
import { OmeTiffLoader } from "@vivjs/loaders";

// 默认 OME-TIFF 图像 URL（可替换为自己的文件）
const imageUrl = ref("https://viv-demo.s3.amazonaws.com/ome-tiff/idr0094A/idr0094A-planes.ome.tif");

// 存储通道信息
const channels = ref([
  { color: [255, 0, 0], contrastLimits: [0, 255], opacity: 1 }, // 红色通道
  { color: [0, 255, 0], contrastLimits: [0, 255], opacity: 1 }, // 绿色通道
  { color: [0, 0, 255], contrastLimits: [0, 255], opacity: 1 }, // 蓝色通道
]);

// 加载器
const loader = ref(null);

// 在组件加载时初始化图像加载
onMounted(async () => {
  loader.value = await OmeTiffLoader.fromUrl(imageUrl.value);
});

// 添加新通道
const addChannel = () => {
  channels.value.push({
    color: [Math.random() * 255, Math.random() * 255, Math.random() * 255],
    contrastLimits: [0, 255],
    opacity: 1,
  });
};

// 生成 WebGL 渲染图层
const getLayers = () => {
  if (!loader.value) return [];
  return [
    new MultiscaleImageLayer({
      loader: loader.value,
      contrastLimits: channels.value.map((c) => c.contrastLimits),
      colors: channels.value.map((c) => c.color),
      opacity: channels.value.map((c) => c.opacity),
    }),
  ];
};
</script>

<template>
  <div class="viewer-container">
    <!-- 添加通道按钮 -->
    <button @click="addChannel">➕ 添加通道</button>

    <!-- 通道参数设置 -->
    <div class="channel-settings">
      <div v-for="(channel, index) in channels" :key="index">
        <label>通道 {{ index + 1 }}</label>
        <input type="color" v-model="channel.color" />
        <input type="range" min="0" max="1" step="0.1" v-model="channel.opacity" />
      </div>
    </div>

    <!-- 渲染 Viewer -->
    <Viewer v-if="loader" :layers="getLayers()" />
  </div>
</template>

<style>
.viewer-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.channel-settings {
  display: flex;
  gap: 10px;
}
</style>
