// 组件名必须和文件名大小写一致。
import React, { useReducer } from "react";
import { useState, useEffect, useRef } from "react";

const RulerWarp = () => {
    const containerRef = useRef(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    return (
        <div className="ruler-warp">
            <div className="ruler-warp-inner">
                <div className="ruler-warp-inner-inner"></div>
            </div>
        </div>
    );
}
