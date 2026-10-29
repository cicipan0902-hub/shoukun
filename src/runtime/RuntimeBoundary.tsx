import { Component, type ReactNode } from "react";
export class RuntimeBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <section className="runtime-recovery" role="alert">
          <h2>这个页面暂时没能打开</h2>
          <p>本地预览更新后，可能需要刷新一次。已经保存的剧情进度会保留。</p>
          <button onClick={() => location.reload()}>刷新并继续</button>
        </section>
      );
    return this.props.children;
  }
}
