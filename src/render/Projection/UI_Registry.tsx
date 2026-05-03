import { lazy, Suspense } from 'react';
import { DefaultComponent, LoadingComponent } from './DefaultComponents';
import { useStore } from '../Reality/Global_Store/Store';
import { GlobalState } from '../Reality/Global_Store/Schema';
import type { UIRegistType } from '../Reality/Global_Store/Schema_Slices_WithLogic/UI_Style_Slice';

type UIMapType = {
    // 类型体操来了
    //lazy返回这个确切的类型，应该知道。
    // ComponentType是react的组件类型（类组件，或者函数组件），只要组件能处理它的<P>，都可以作为ComponentType
    [key in UIRegistType]?: React.LazyExoticComponent<React.ComponentType<{ id: string }>>;
};

// lazy，否则运行时直接真的加载所有组件也太难绷了
export const UI_MAP: UIMapType = {
    // 
    // 'dial_knob' : lazy(() => import('./dial_knob')),
} satisfies UIMapType; //satisfies可以确保键不会超出enum范围

// Suspense是React的一个边界组件，用于异步加载处理。在未加载完成时，显示备用组件
const LoadUI = ({ id }: { id: string}) => {
    const uiRegistType = useStore(state => state.style[id]?.uiRegistType);

    const Component = uiRegistType ? UI_MAP[uiRegistType] : undefined;

    if(!Component){
        return <DefaultComponent id={id} />
    }

    return (
        <Suspense fallback={<LoadingComponent />}>
            <Component id={id} />
        </Suspense>
    );
}