import {
	FileText,
	GripHorizontal,
	GripVertical,
	PanelLeft,
	PanelLeftClose,
	PlayCircle,
	Save,
	Settings2,
	Type,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// --- 常量与类型 ---
const GRID_SIZE = 20;

export interface Action {
	id: string;
	label: string;
	payload: string;
}
export interface RectElement {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	color: string;
	opacity: number;
	borderWidth: number;
	borderColor: string;
	text: string;
	textColor: string;
	groupId: string | null;
	zIndex: number;
	actions: Action[];
}

const Board: React.FC = () => {
	const [elements, setElements] = useState<RectElement[]>([]);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [scale, setScale] = useState(1.0);
	const [globalFontSize, setGlobalFontSize] = useState(14);

	// UI 布局状态
	const [isLeftVisible, setIsLeftVisible] = useState(false);
	const [leftWidth, setLeftWidth] = useState(200);
	const [bottomHeight, setBottomHeight] = useState(220);
	const [bottomMode, setBottomMode] = useState<"actions" | "editor" | "save">("actions");

	// 保存相关状态
	const [autoSaveInterval, setAutoSaveInterval] = useState(30);
	const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
	const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

	// 交互模式
	const [mode, setMode] = useState<
		"none" | "moving" | "resizing" | "selecting" | "panel_resizing"
	>("none");
	const [activeId, setActiveId] = useState<string | null>(null);
	const [resizeDir, setResizeDir] = useState<string>("");
	const [selectionBox, setSelectionBox] = useState<{
		x1: number;
		y1: number;
		x2: number;
		y2: number;
	} | null>(null);
	const [contextMenu, setContextMenu] = useState<{
		x: number;
		y: number;
	} | null>(null);

	// 引用
	const viewportRef = useRef<HTMLDivElement>(null);
	const boardRef = useRef<HTMLDivElement>(null);
	const topBarRef = useRef<HTMLDivElement>(null);
	const lastTopHeight = useRef(0);
	const dragData = useRef({
		startX: 0,
		startY: 0,
		initialElements: [] as RectElement[],
		initialVal: 0,
	});

	// --- 0. 保存与加载 ---
	const STORAGE_KEY = "canvas_board_data";
	const SETTINGS_KEY = "canvas_board_settings";

	const saveToStorage = useCallback(() => {
		const data = {
			elements,
			scale,
			globalFontSize,
			leftWidth,
			bottomHeight,
			autoSaveInterval,
			savedAt: Date.now(),
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		localStorage.setItem(SETTINGS_KEY, JSON.stringify({ autoSaveInterval }));
		setLastSaveTime(Date.now());
	}, [elements, scale, globalFontSize, leftWidth, bottomHeight, autoSaveInterval]);

	const saveToFile = useCallback(() => {
		const data = {
			elements,
			scale,
			globalFontSize,
			leftWidth,
			bottomHeight,
			autoSaveInterval,
			savedAt: Date.now(),
		};
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "Board.data.json";
		a.click();
		URL.revokeObjectURL(url);
		saveToStorage();
	}, [elements, scale, globalFontSize, leftWidth, bottomHeight, autoSaveInterval, saveToStorage]);

	const loadFromStorage = useCallback(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const data = JSON.parse(raw);
				if (data.elements) setElements(data.elements);
				if (typeof data.scale === "number") setScale(data.scale);
				if (typeof data.globalFontSize === "number") setGlobalFontSize(data.globalFontSize);
				if (typeof data.leftWidth === "number") setLeftWidth(data.leftWidth);
				if (typeof data.bottomHeight === "number") setBottomHeight(data.bottomHeight);
				setLastSaveTime(data.savedAt || null);
			}
			const settingsRaw = localStorage.getItem(SETTINGS_KEY);
			if (settingsRaw) {
				const settings = JSON.parse(settingsRaw);
				if (typeof settings.autoSaveInterval === "number") {
					setAutoSaveInterval(settings.autoSaveInterval);
				}
			}
		} catch {}
	}, []);

	useEffect(() => {
		loadFromStorage();
	}, [loadFromStorage]);

	useEffect(() => {
		if (autoSaveTimerRef.current) {
			clearInterval(autoSaveTimerRef.current);
		}
		if (autoSaveInterval > 0) {
			autoSaveTimerRef.current = setInterval(() => {
				saveToStorage();
			}, autoSaveInterval * 1000);
		}
		return () => {
			if (autoSaveTimerRef.current) {
				clearInterval(autoSaveTimerRef.current);
			}
		};
	}, [autoSaveInterval, saveToStorage]);

	// --- 1. 防止顶栏换行引起画布跳变 (核心逻辑) ---
	useLayoutEffect(() => {
		if (!topBarRef.current || !viewportRef.current) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const newHeight = entry.contentRect.height;
				if (
					lastTopHeight.current !== 0 &&
					lastTopHeight.current !== newHeight
				) {
					const diff = newHeight - lastTopHeight.current;
					if (viewportRef.current) {
						viewportRef.current.scrollTop += diff;
					}
				}
				lastTopHeight.current = newHeight;
			}
		});

		observer.observe(topBarRef.current);
		return () => observer.disconnect();
	}, []);

	// --- 2. 初始化：画布居中 ---
	useEffect(() => {
		if (viewportRef.current) {
			const v = viewportRef.current;
			v.scrollLeft = 2500 - v.clientWidth / 2;
			v.scrollTop = 2500 - v.clientHeight / 2;
		}
	}, []);

	// --- 3. 稳定缩放 (以视口中心为原点) ---
	const handleZoom = (delta: number) => {
		const v = viewportRef.current;
		if (!v) return;
		const oldScale = scale;
		const newScale = Math.max(0.1, Math.min(5, oldScale + delta));
		const centerX = (v.scrollLeft + v.clientWidth / 2) / oldScale;
		const centerY = (v.scrollTop + v.clientHeight / 2) / oldScale;
		setScale(newScale);
		requestAnimationFrame(() => {
			v.scrollLeft = centerX * newScale - v.clientWidth / 2;
			v.scrollTop = centerY * newScale - v.clientHeight / 2;
		});
	};

	// --- 4. 坐标与数据处理 ---
	const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;
	const getMousePos = (e: React.MouseEvent | MouseEvent) => {
		const rect = boardRef.current?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };
		return {
			x: (e.clientX - rect.left) / scale,
			y: (e.clientY - rect.top) / scale,
		};
	};

	const sortedElements = useMemo(
		() => [...elements].sort((a, b) => a.zIndex - b.zIndex),
		[elements],
	);
	const mainSelected = elements.find((el) => el.id === selectedIds[0]);

	const updateSelected = (patch: Partial<RectElement>) => {
		setElements((prev) =>
			prev.map((el) =>
				selectedIds.includes(el.id) ? { ...el, ...patch } : el,
			),
		);
	};

	// --- 5. 事件处理器 ---
	const handleMouseDown = (e: React.MouseEvent) => {
		if (mode === "panel_resizing") return;
		const pos = getMousePos(e);
		setContextMenu(null);

		if (e.target === boardRef.current) {
			setSelectedIds([]);
			setMode("selecting");
			setSelectionBox({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
			return;
		}

		const clickedEl = [...sortedElements]
			.reverse()
			.find(
				(el) =>
					pos.x >= el.x &&
					pos.x <= el.x + el.width &&
					pos.y >= el.y &&
					pos.y <= el.y + el.height,
			);

		if (clickedEl) {
			let newIds = selectedIds.includes(clickedEl.id)
				? selectedIds
				: [clickedEl.id];
			if (e.shiftKey)
				newIds = selectedIds.includes(clickedEl.id)
					? selectedIds.filter((id) => id !== clickedEl.id)
					: [...selectedIds, clickedEl.id];
			if (clickedEl.groupId) {
				const group = elements
					.filter((el) => el.groupId === clickedEl.groupId)
					.map((el) => el.id);
				newIds = Array.from(new Set([...newIds, ...group]));
			}
			setSelectedIds(newIds);
			setMode("moving");
			dragData.current = {
				startX: pos.x,
				startY: pos.y,
				initialElements: JSON.parse(JSON.stringify(elements)),
				initialVal: 0,
			};
		}
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (mode === "none" || mode === "panel_resizing") return;
		const pos = getMousePos(e);

		if (mode === "moving") {
			const dx = snap(pos.x - dragData.current.startX);
			const dy = snap(pos.y - dragData.current.startY);
			setElements((prev) =>
				prev.map((el) => {
					if (!selectedIds.includes(el.id)) return el;
					const init = dragData.current.initialElements.find(
						(i) => i.id === el.id,
					);
					return init ? { ...el, x: init.x + dx, y: init.y + dy } : el;
				}),
			);
		} else if (mode === "resizing" && activeId) {
			const dx = snap(pos.x - dragData.current.startX);
			const dy = snap(pos.y - dragData.current.startY);
			const initEl = dragData.current.initialElements[0];
			setElements((prev) =>
				prev.map((el) => {
					if (el.id !== activeId) return el;
					let { x, y, width, height } = initEl;
					if (resizeDir.includes("e")) width += dx;
					if (resizeDir.includes("s")) height += dy;
					if (resizeDir.includes("w")) {
						x += dx;
						width -= dx;
					}
					if (resizeDir.includes("n")) {
						y += dy;
						height -= dy;
					}
					return {
						...el,
						x,
						y,
						width: Math.max(GRID_SIZE, width),
						height: Math.max(GRID_SIZE, height),
					};
				}),
			);
		} else if (mode === "selecting") {
			setSelectionBox((prev) =>
				prev ? { ...prev, x2: pos.x, y2: pos.y } : null,
			);
		}
	};

	const handleMouseUp = () => {
		if (mode === "selecting" && selectionBox) {
			const xMin = Math.min(selectionBox.x1, selectionBox.x2),
				xMax = Math.max(selectionBox.x1, selectionBox.x2);
			const yMin = Math.min(selectionBox.y1, selectionBox.y2),
				yMax = Math.max(selectionBox.y1, selectionBox.y2);
			setSelectedIds(
				elements
					.filter(
						(el) =>
							el.x < xMax &&
							el.x + el.width > xMin &&
							el.y < yMax &&
							el.y + el.height > yMin,
					)
					.map((el) => el.id),
			);
		}
		setMode("none");
		setSelectionBox(null);
	};

	const startPanelResize = (e: React.MouseEvent, type: "left" | "bottom") => {
		e.preventDefault();
		setMode("panel_resizing");
		dragData.current = {
			startX: e.clientX,
			startY: e.clientY,
			initialElements: [],
			initialVal: type === "left" ? leftWidth : bottomHeight,
		};
		const onMove = (me: MouseEvent) => {
			if (type === "left")
				setLeftWidth(
					Math.max(
						100,
						dragData.current.initialVal +
							(me.clientX - dragData.current.startX),
					),
				);
			if (type === "bottom")
				setBottomHeight(
					Math.max(
						100,
						dragData.current.initialVal -
							(me.clientY - dragData.current.startY),
					),
				);
		};
		const onUp = () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
			setMode("none");
		};
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Canvas container
		<div style={styles.container} onMouseUp={handleMouseUp}>
			{/* --- 顶部面板 (支持响应式换行且不产生跳变) --- */}
			<div ref={topBarRef} style={styles.topBar}>
				<div style={styles.flexWrapContainer}>
					<div style={styles.toolbarGroup}>
						<span style={styles.brand}>DESIGN PRO v6</span>
						<button
							type="button"
							style={styles.iconBtn}
							onClick={() => setIsLeftVisible(!isLeftVisible)}
						>
							{isLeftVisible ? (
								<PanelLeftClose size={18} />
							) : (
								<PanelLeft size={18} />
							)}
						</button>
						<div style={styles.divider} />
						<div style={styles.toolItem}>
							<button
								type="button"
								style={styles.iconBtn}
								onClick={() => handleZoom(-0.1)}
							>
								<ZoomOut size={16} />
							</button>
							<span style={styles.valueText}>{Math.round(scale * 100)}%</span>
							<button
								type="button"
								style={styles.iconBtn}
								onClick={() => handleZoom(0.1)}
							>
								<ZoomIn size={16} />
							</button>
						</div>
						<div style={styles.divider} />
						<div style={styles.toolItem}>
							<Type size={16} color="#333" />
							<input
								type="range"
								min="1"
								max="100"
								value={globalFontSize}
								onChange={(e) =>
									setGlobalFontSize(parseInt(e.target.value, 10))
								}
							/>
							<span style={styles.valueText}>{globalFontSize}px</span>
						</div>
					</div>

					<div style={styles.toolbarGroup}>
						{selectedIds.length > 0 && (
							<>
								<div style={styles.toolItem}>
									<span style={styles.label}>层级</span>
									<input
										type="number"
										style={styles.numInput}
										value={mainSelected?.zIndex || 0}
										onChange={(e) =>
											updateSelected({
												zIndex: parseInt(e.target.value, 10) || 0,
											})
										}
									/>
								</div>
								<div style={styles.toolItem}>
									<span style={styles.label}>背景</span>
									<input
										type="color"
										value={mainSelected?.color}
										onChange={(e) => updateSelected({ color: e.target.value })}
									/>
								</div>
								<div style={styles.toolItem}>
									<span style={styles.label}>边框</span>
									<input
										type="color"
										value={mainSelected?.borderColor}
										onChange={(e) =>
											updateSelected({ borderColor: e.target.value })
										}
									/>
								</div>
								<div style={styles.toolItem}>
									<span style={styles.label}>文字</span>
									<input
										type="color"
										value={mainSelected?.textColor || "#000000"}
										onChange={(e) =>
											updateSelected({ textColor: e.target.value })
										}
									/>
								</div>
							</>
						)}
					</div>
				</div>
			</div>

			<div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
				{/* --- 左侧面板 --- */}
				{isLeftVisible && (
					<div style={{ ...styles.leftBar, width: leftWidth }}>
						<div style={styles.sideTitle}>图层 (Layer)</div>
						<div role="listbox" style={styles.layerList}>
							{sortedElements
								.slice()
								.reverse()
								.map((el) => (
									<div
										key={el.id}
										role="option"
										tabIndex={0}
										style={{
											...styles.layerItem,
											borderLeft: `4px solid ${el.borderColor}`,
											color: el.color,
											background: selectedIds.includes(el.id)
												? "#000000ff"
												: "#d4d4d4ff",
										}}
										onClick={() => setSelectedIds([el.id])}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												setSelectedIds([el.id]);
											}
										}}
									>
										<span style={{ color: "#666", marginRight: 8 }}>
											#{el.zIndex}
										</span>
										{el.text.split("\n")[0] || "(Empty)"}
									</div>
								))}
						</div>
						<button
							type="button"
							style={styles.handleV}
							onMouseDown={(e) => startPanelResize(e, "left")}
						>
							<GripVertical size={14} color="#ccc" />
						</button>
					</div>
				)}

				{/* --- 画布视口 --- */}
				<div ref={viewportRef} style={styles.viewport}>
					<div
						ref={boardRef}
						role="application"
						style={{
							...styles.board,
							width: 5000,
							height: 5000,
							transform: `scale(${scale})`,
							transformOrigin: "0 0",
						}}
						onDoubleClick={(e) => {
							if (e.target !== boardRef.current) return;
							const pos = getMousePos(e);
							const newEl: RectElement = {
								id: `rect_${Date.now()}`,
								x: snap(pos.x - 75),
								y: snap(pos.y - 50),
								width: 160,
								height: 100,
								color: "#ffffff",
								opacity: 1,
								borderWidth: 1,
								borderColor: "#333333",
								text: "",
								textColor: "#000000",
								groupId: null,
								zIndex: elements.length,
								actions: [],
							};
							setElements([...elements, newEl]);
							setSelectedIds([newEl.id]);
						}}
						onMouseDown={handleMouseDown}
						onMouseMove={handleMouseMove}
						onContextMenu={(e) => {
							e.preventDefault();
							if (selectedIds.length)
								setContextMenu({ x: e.clientX, y: e.clientY });
						}}
					>
						{selectionBox && (
							<div
								style={{
									...styles.selectionMarquee,
									left: Math.min(selectionBox.x1, selectionBox.x2),
									top: Math.min(selectionBox.y1, selectionBox.y2),
									width: Math.abs(selectionBox.x2 - selectionBox.x1),
									height: Math.abs(selectionBox.y2 - selectionBox.y1),
								}}
							/>
						)}

						{sortedElements.map((el) => {
							const isSelected = selectedIds.includes(el.id);
							return (
								// biome-ignore lint/a11y/noStaticElementInteractions: Canvas element
								<div
									key={el.id}
									onDoubleClick={(e) => {
										e.stopPropagation();
										setBottomMode("editor");
									}}
									style={{
										...styles.rect,
										left: el.x,
										top: el.y,
										width: el.width,
										height: el.height,
										backgroundColor: el.color,
										opacity: el.opacity,
										border: `${el.borderWidth}px solid ${el.borderColor}`,
										outline: isSelected ? "3px solid #2196F3" : "none",
										zIndex: el.zIndex,
									}}
								>
									<div
										style={{
											...styles.rectTitle,
											color: el.textColor,
											fontSize: globalFontSize,
										}}
									>
										{el.text.split("\n")[0]}
									</div>
									{isSelected &&
										selectedIds.length === 1 &&
										["n", "s", "e", "w", "nw", "ne", "sw", "se"].map((dir) => (
											<button
												type="button"
												key={dir}
												style={{
													...styles.dotHandle,
													...getHandlePos(dir),
													border: "none",
													background: "transparent",
												}}
												onMouseDown={(e) => {
													e.stopPropagation();
													setMode("resizing");
													setActiveId(el.id);
													setResizeDir(dir);
													dragData.current = {
														startX: getMousePos(e).x,
														startY: getMousePos(e).y,
														initialElements: [JSON.parse(JSON.stringify(el))],
														initialVal: 0,
													};
												}}
											/>
										))}
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* --- 底部面板 --- */}
			<div style={{ ...styles.bottomPanel, height: bottomHeight }}>
				<button
					type="button"
					style={styles.handleH_Top}
					onMouseDown={(e) => startPanelResize(e, "bottom")}
				>
					<GripHorizontal size={14} color="#ccc" />
				</button>
				<div style={styles.bottomTabs}>
					<button
						type="button"
						style={{
							...styles.tab,
							borderBottom:
								bottomMode === "actions" ? "3px solid #2196F3" : "none",
						}}
						onClick={() => setBottomMode("actions")}
					>
						<Settings2 size={16} /> 接口配置
					</button>
					<button
						type="button"
						style={{
							...styles.tab,
							borderBottom:
								bottomMode === "editor" ? "3px solid #2196F3" : "none",
						}}
						onClick={() => setBottomMode("editor")}
					>
						<FileText size={16} /> 详细文本
					</button>
					<button
						type="button"
						style={{
							...styles.tab,
							borderBottom:
								bottomMode === "save" ? "3px solid #2196F3" : "none",
						}}
						onClick={() => setBottomMode("save")}
					>
						<Save size={16} /> 保存
					</button>
				</div>

				<div style={styles.bottomContent}>
					{bottomMode === "actions" ? (
						<div style={styles.actionGrid}>
							{mainSelected ? (
								<>
									{mainSelected.actions.map((act, i) => (
										<div key={act.id} style={styles.actionCard}>
											<input
												style={styles.miniInput}
												value={act.label}
												onChange={(e) => {
													const nas = [...mainSelected.actions];
													nas[i].label = e.target.value;
													setElements(
														elements.map((el) =>
															el.id === mainSelected.id
																? { ...el, actions: nas }
																: el,
														),
													);
												}}
											/>
											<input
												style={styles.miniInput}
												value={act.payload}
												placeholder="Payload"
												onChange={(e) => {
													const nas = [...mainSelected.actions];
													nas[i].payload = e.target.value;
													setElements(
														elements.map((el) =>
															el.id === mainSelected.id
																? { ...el, actions: nas }
																: el,
														),
													);
												}}
											/>
											<button
												type="button"
												style={styles.runBtn}
												onClick={() => alert(`Payload: ${act.payload}`)}
											>
												<PlayCircle size={16} />
											</button>
											<button
												type="button"
												style={styles.miniDelBtn}
												onClick={() => {
													const nas = mainSelected.actions.filter(
														(a) => a.id !== act.id,
													);
													setElements(
														elements.map((el) =>
															el.id === mainSelected.id
																? { ...el, actions: nas }
																: el,
														),
													);
												}}
											>
												<X size={14} />
											</button>
										</div>
									))}
									<button
										type="button"
										style={styles.addCardBtn}
										onClick={() => {
											const nas = [
												...mainSelected.actions,
												{
													id: Date.now().toString(),
													label: "Action",
													payload: "",
												},
											];
											setElements(
												elements.map((el) =>
													el.id === mainSelected.id
														? { ...el, actions: nas }
														: el,
												),
											);
										}}
									>
										+ 新增接口
									</button>
								</>
							) : (
								<div style={styles.emptyPrompt}>请选择一个矩形</div>
							)}
						</div>
					) : bottomMode === "editor" ? (
						<textarea
							style={styles.bottomEditor}
							placeholder="输入文本内容..."
							value={mainSelected?.text || ""}
							onChange={(e) =>
								setElements(
									elements.map((el) =>
										selectedIds.includes(el.id)
											? { ...el, text: e.target.value }
											: el,
									),
								)
							}
						/>
					) : (
						<div style={styles.savePanel}>
							<div style={styles.saveSection}>
								<h4 style={styles.saveTitle}>手动保存</h4>
								<p style={styles.saveDesc}>将当前画布数据导出为 JSON 文件，保存到 Board.data.json</p>
								<button type="button" style={styles.saveBtn} onClick={saveToFile}>
									<Save size={18} /> 导出保存
								</button>
							</div>
							<div style={styles.saveSection}>
								<h4 style={styles.saveTitle}>自动保存</h4>
								<p style={styles.saveDesc}>设置自动保存间隔时间（秒），0 表示禁用自动保存</p>
								<div style={styles.saveRow}>
									<input
										type="number"
										min="0"
										max="3600"
										value={autoSaveInterval}
										onChange={(e) => setAutoSaveInterval(Math.max(0, parseInt(e.target.value, 10) || 0))}
										style={styles.intervalInput}
									/>
									<span style={styles.saveLabel}>秒</span>
								</div>
							</div>
							{lastSaveTime && (
								<div style={styles.saveSection}>
									<h4 style={styles.saveTitle}>上次保存</h4>
									<p style={styles.saveTimeText}>{new Date(lastSaveTime).toLocaleString()}</p>
								</div>
							)}
							<div style={styles.saveSection}>
								<h4 style={styles.saveTitle}>数据统计</h4>
								<p style={styles.saveTimeText}>元素数量: {elements.length}</p>
							</div>
						</div>
					)}
				</div>
			</div>

			{contextMenu && (
				<div
					style={{
						...styles.contextMenu,
						left: contextMenu.x,
						top: contextMenu.y,
					}}
				>
					<button
						type="button"
						style={styles.menuItem}
						onClick={() => {
							setElements(elements.filter((e) => !selectedIds.includes(e.id)));
							setSelectedIds([]);
							setContextMenu(null);
						}}
					>
						彻底移除
					</button>
				</div>
			)}
		</div>
	);
};

// --- 样式定义 ---
const styles = {
	container: {
		display: "flex",
		flexDirection: "column",
		height: "100vh",
		width: "100%",
		background: "#f5f5f5",
		overflow: "hidden",
		color: "#333",
	} as const,
	topBar: {
		background: "#fff",
		borderBottom: "1px solid #ddd",
		padding: "12px 20px",
		zIndex: 100,
		minHeight: 48,
		width: "100%",
		boxSizing: "border-box",
	} as const,
	flexWrapContainer: {
		display: "flex",
		flexWrap: "wrap",
		gap: "20px",
		alignItems: "center",
		width: "100%",
	} as const,
	leftBar: {
		position: "relative",
		background: "#fff",
		borderRight: "1px solid #ddd",
		display: "flex",
		flexDirection: "column",
		zIndex: 90,
	} as const,
	viewport: {
		flex: 1,
		overflow: "auto",
		background: "#e0e0e0",
		position: "relative",
	} as const,
	board: {
		position: "relative",
		background: "#fff",
		backgroundImage: `linear-gradient(#f0f0f0 1px, transparent 1px), linear-gradient(90deg, #f0f0f0 1px, transparent 1px)`,
		backgroundSize: "20px 20px",
	} as const,
	bottomPanel: {
		position: "relative",
		background: "#fff",
		borderTop: "1px solid #ddd",
		display: "flex",
		flexDirection: "column",
		zIndex: 100,
	} as const,

	handleV: {
		position: "absolute",
		top: 0,
		bottom: 0,
		right: 0,
		width: "6px",
		cursor: "ew-resize",
		display: "flex",
		alignItems: "center",
		background: "#000000ff",
	} as const,
	handleH_Top: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: "6px",
		cursor: "ns-resize",
		display: "flex",
		justifyContent: "center",
		background: "#fafafa",
	} as const,

	toolbarGroup: { display: "flex", alignItems: "center", gap: "15px" },
	toolItem: { display: "flex", alignItems: "center", gap: "8px" },
	brand: { fontWeight: 900, color: "#2196F3", fontSize: 18 },
	divider: { width: 1, height: 24, background: "#eee" },
	numInput: {
		width: 45,
		border: "1px solid #ddd",
		borderRadius: 4,
		padding: "4px",
		textAlign: "center",
	} as const,
	iconBtn: {
		background: "#fff",
		border: "1px solid #ddd",
		padding: "6px",
		cursor: "pointer",
		borderRadius: 6,
		display: "flex",
	},
	valueText: { fontSize: 13, fontWeight: "bold", minWidth: 40 },
	label: { fontSize: 12, color: "#666", fontWeight: 600 },

	sideTitle: {
		padding: "12px 15px",
		fontSize: 13,
		fontWeight: "bold",
		background: "#f8f9fa",
		borderBottom: "1px solid #eee",
	},
	layerList: { flex: 1, overflowY: "auto" } as const,
	layerItem: {
		padding: "10px 15px",
		fontSize: 12,
		cursor: "pointer",
		borderBottom: "1px solid #f9f9f9",
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
	} as const,

	bottomTabs: {
		display: "flex",
		gap: 15,
		padding: "0 20px",
		background: "#fcfcfc",
		borderBottom: "1px solid #eee",
	} as const,
	tab: {
		padding: "12px 10px",
		border: "none",
		background: "none",
		cursor: "pointer",
		fontSize: 14,
		display: "flex",
		alignItems: "center",
		gap: 8,
		fontWeight: 600,
	} as const,
	bottomContent: { flex: 1, overflow: "hidden" } as const,
	actionGrid: {
		padding: 15,
		display: "flex",
		flexWrap: "wrap",
		gap: 10,
		alignContent: "flex-start",
	} as const,
	actionCard: {
		background: "#fff",
		border: "1px solid #ddd",
		borderRadius: 8,
		padding: "8px",
		display: "flex",
		alignItems: "center",
		gap: 6,
	},
	miniInput: {
		width: 80,
		fontSize: 12,
		border: "1px solid #eee",
		padding: "4px",
		borderRadius: 4,
	},
	runBtn: {
		background: "#2196F3",
		color: "#fff",
		border: "none",
		borderRadius: 6,
		padding: "6px",
		cursor: "pointer",
	},
	miniDelBtn: {
		background: "#f5f5f5",
		border: "none",
		borderRadius: 6,
		padding: "6px",
		cursor: "pointer",
		color: "#888",
	},
	addCardBtn: {
		border: "1px dashed #2196F3",
		color: "#2196F3",
		background: "#f0f7ff",
		padding: "8px 15px",
		borderRadius: 8,
		cursor: "pointer",
		fontWeight: "bold",
	},
	bottomEditor: {
		width: "100%",
		height: "100%",
		border: "none",
		padding: "20px",
		fontSize: 16,
		outline: "none",
		resize: "none" as const,
		background: "#fff",
	},
	emptyPrompt: { color: "#bbb", margin: "40px auto" },

	savePanel: {
		padding: "20px",
		display: "flex",
		flexWrap: "wrap",
		gap: "20px",
		alignContent: "flex-start",
		overflowY: "auto",
	} as const,
	saveSection: {
		background: "#f8f9fa",
		border: "1px solid #eee",
		borderRadius: 10,
		padding: "15px",
		minWidth: "220px",
		flex: 1,
	} as const,
	saveTitle: {
		margin: "0 0 8px 0",
		fontSize: 14,
		fontWeight: 700,
		color: "#333",
	} as const,
	saveDesc: {
		margin: "0 0 12px 0",
		fontSize: 12,
		color: "#666",
		lineHeight: 1.5,
	} as const,
	saveBtn: {
		background: "#2196F3",
		color: "#fff",
		border: "none",
		borderRadius: 8,
		padding: "10px 20px",
		cursor: "pointer",
		fontSize: 14,
		fontWeight: 600,
		display: "flex",
		alignItems: "center",
		gap: 8,
	} as const,
	saveRow: {
		display: "flex",
		alignItems: "center",
		gap: 10,
	} as const,
	intervalInput: {
		width: 80,
		border: "1px solid #ddd",
		borderRadius: 6,
		padding: "8px",
		fontSize: 14,
		textAlign: "center",
	} as const,
	saveLabel: {
		fontSize: 13,
		color: "#666",
	} as const,
	saveTimeText: {
		fontSize: 13,
		color: "#888",
		margin: 0,
	} as const,

	rect: {
		position: "absolute",
		cursor: "move",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	} as const,
	rectTitle: {
		padding: 10,
		textAlign: "center",
		fontWeight: "bold",
		width: "100%",
		wordBreak: "break-all",
	} as const,
	dotHandle: {
		position: "absolute",
		width: 12,
		height: 12,
		borderRadius: "50%",
		background: "#2196F3",
		border: "2px solid #fff",
		zIndex: 100,
	} as const,
	selectionMarquee: {
		position: "absolute",
		border: "1px dashed #2196F3",
		background: "rgba(33, 150, 243, 0.08)",
		pointerEvents: "none",
		zIndex: 5000,
	} as const,
	contextMenu: {
		position: "fixed" as const,
		background: "#fff",
		border: "1px solid #ddd",
		boxShadow: "0 5px 20px rgba(0,0,0,0.15)",
		zIndex: 5000,
		padding: "6px 0",
		borderRadius: 8,
	},
	menuItem: {
		padding: "10px 20px",
		cursor: "pointer",
		fontSize: 14,
		color: "#ff4d4f",
		fontWeight: 500,
	},
};

const getHandlePos = (dir: string): React.CSSProperties => {
	const offset = -6;
	const s: React.CSSProperties = {
		cursor: `${dir}-resize` as React.CSSProperties["cursor"],
	};
	if (dir.includes("n")) s.top = offset;
	if (dir.includes("s")) s.bottom = offset;
	if (dir.includes("w")) s.left = offset;
	if (dir.includes("e")) s.right = offset;
	if (dir === "n" || dir === "s") {
		s.left = "50%";
		s.marginLeft = offset;
	}
	if (dir === "e" || dir === "w") {
		s.top = "50%";
		s.marginTop = offset;
	}
	return s;
};

export default Board;
