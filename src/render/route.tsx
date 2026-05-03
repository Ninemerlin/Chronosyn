import { createHashRouter, Outlet } from 'react-router'
import App from './App';
import R_IDE_UI from './Reality/R_IDE/R_IDE_UI'

function Layout() {
  return ( // React Router功能：使用Outlet占位符，定义子组件渲染到父组件中的位置
    <div style={{ display: 'flex' , width: '100%', height: '100%' }} >
      <Outlet /> 
    </div>
  )
}

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true, //默认路由
        element: <R_IDE_UI />,
      },
      {
        path: '/R_IDE',
        element: <App />,
      },
    ],
  },
]);