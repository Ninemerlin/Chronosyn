import { useEffect, useRef } from 'react';
import { Application, Assets, Sprite } from 'pixi.js';

export const PixiScene = () => {
  const containerRef = useRef<HTMLDivElement>(null);// 创建一个钩子，指向页面上的 <div>，作为 Pixi 画布的容器。
  const appRef = useRef<Application | null>(null);// 创建一个钩子，用来持久化存储 Pixi 实例，防止多次初始化。

  useEffect(() => { //副作用-不属于画图逻辑的事情。return负责清理
    if (appRef.current) return; //【关键】如果已经初始化过了，就直接返回，防止 React 在开发模式下运行两次。

    const init = async () => {
      const app = new Application();
      appRef.current = app;

      await app.init({
        background: '#1099bb',
        width: containerRef.current?.clientWidth || window.innerWidth,
        height: containerRef.current?.clientHeight || window.innerHeight,
      });

      if (containerRef.current) {
        containerRef.current.appendChild(app.canvas); // 【核心】将 Pixi 自动生成的 <canvas> 标签插入到 React 的 <div> 中。
      }

      const texture = await Assets.load('https://pixijs.com/assets/bunny.png');
      const bunny = new Sprite(texture);
      bunny.anchor.set(0.5);
      bunny.x = app.screen.width / 2;
      bunny.y = app.screen.height / 2;
      app.stage.addChild(bunny); // 【核心】将 bunny 添加到 Pixi 的场景中。

      app.ticker.add((time) => {
        bunny.rotation += 0.1 * time.deltaTime;
      });
    };

    init(); //刚写好的异步函数，启动！

    return () => {
      if (appRef.current) {
        // 调用 destroy 方法，它是 Pixi 的终极清理方案
        appRef.current.destroy(true, {
          children: true,  // 销毁所有子元素（兔子、容器等）
          texture: true,   // 销毁纹理（释放显存）
        });
        
        appRef.current = null;
      }
    };
  }, []); //如果没有第二参数数组，每次组件重新渲染都会运行。否则就只在初始化一次。如果数组有内容，任意内容变了，就会运行

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />;
};

export default PixiScene;