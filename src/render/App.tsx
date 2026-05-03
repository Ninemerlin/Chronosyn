import { hc } from "hono/client";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AppType } from "@/main/route";

import "./index.css";

const client = hc<AppType>("http://localhost:3000");
export default function App() {
	const [data, setData] = useState("Loading...");

	useEffect(() => {
		// 定义一个异步函数
		const fetchData = async () => {
			try {
				const res = await client.api.hello.$get();

				if (res.ok) {
					const json = await res.json();
					setData(json.message);
				} else {
					setData(`Request failed: ${res.status}`);
				}
			} catch (err) {
				setData(`Error: ${String(err)}`);
			}
		};

		fetchData();
	}, []);

	return (
		<div style={{ padding: 20 }}>
			<h1>React Fronted</h1>
			<p>
				Backend says: <strong>{data}</strong>
			</p>
			<div className="mt-8">
				<Link
					to="/"
					style={{
						padding: "10px 20px",
						backgroundColor: "#4f46e5",
						color: "#fff",
						border: "none",
						borderRadius: "4px",
						cursor: "pointer",
						marginTop: "10px",
						textDecoration: "none",
						display: "inline-block",
					}}
				>
					转入IDE
				</Link>
			</div>
		</div>
	);
}
