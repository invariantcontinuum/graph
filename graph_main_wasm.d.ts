/* tslint:disable */
/* eslint-disable */

export class RenderEngine {
    free(): void;
    [Symbol.dispose](): void;
    constructor(canvas: HTMLCanvasElement);
    /**
     * Debug: return current dim tween state so the host can confirm spotlight
     * is reaching the GPU.
     */
    debug_focus_state(): any;
    /**
     * Return (and clear) pending worker messages queued by drag handlers.
     * The React wrapper calls this after each drag event and forwards the
     * results via `worker.postMessage`.
     */
    drain_worker_messages(): any;
    /**
     * Compute the AABB of current node positions and snap the camera to it.
     * Called from JS after every `update_positions` + layout settlement.
     * NOTE: this is a snap (immediate write), not animated — only `focus_fit`
     * uses the animated camera tween.
     */
    fit(padding_px: number): void;
    /**
     * Focus a node AND animate the camera to frame its 1-hop neighborhood.
     * When `id` is `None`, clears focus and animates to fit all nodes.
     */
    focus_fit(id: string | null | undefined, padding_px: number): void;
    /**
     * Main render tick. Returns `true` when the scene actually repainted
     * (so the host can schedule the next RAF only when needed).
     */
    frame(timestamp: number): boolean;
    get_legend(): any;
    handle_click(screen_x: number, screen_y: number): string | undefined;
    handle_hover(screen_x: number, screen_y: number): string | undefined;
    /**
     * End the current drag. Queues an `unpin_node` message so the force
     * layout reclaims the node.
     */
    handle_node_drag_end(): void;
    /**
     * Update the currently-dragged node's position. No-op if no drag active.
     */
    handle_node_drag_move(screen_x: number, screen_y: number): void;
    /**
     * Start dragging the node at the given screen coordinates.
     * Returns the node id if a node was picked, otherwise `None` (caller should
     * fall back to pan).
     */
    handle_node_drag_start(screen_x: number, screen_y: number): string | undefined;
    handle_pan_end(): void;
    handle_pan_move(x: number, y: number): void;
    handle_pan_start(x: number, y: number): void;
    handle_zoom(delta: number, x: number, y: number): void;
    needs_frame(): boolean;
    /**
     * Pan the camera to center on the node with id `id`, preserving the
     * current zoom level. Legacy Cytoscape `cy.center(node)` equivalent.
     */
    pan_to_node(id: string): void;
    /**
     * Re-upload GPU buffers after a WebGL context loss → restore sequence.
     */
    rehydrate(): void;
    request_render(): void;
    set_community_hulls(show: boolean): void;
    set_edge_metadata(ids_js: any, types_js: any): void;
    set_edge_type_keys(keys: string[]): void;
    /**
     * Focus a node: dim every non-neighbor via `visual_flags` (bit 0 = dimmed).
     * `None` clears the focus.
     */
    set_focus(id?: string | null): void;
    set_node_ids(ids: string[]): void;
    set_node_metadata(ids_js: any, types_js: any, statuses_js: any): void;
    set_theme(theme_js: any): void;
    /**
     * Subscribe to edge-data updates (for the Canvas2D EdgeLabelsOverlay).
     * Returns a subscriber index usable with `unsubscribe_edges`.
     */
    subscribe_edges(cb: Function): number;
    /**
     * Subscribe to per-frame position+camera updates (for the Canvas2D label overlay).
     * Callback invoked once per `frame()` tick with `{positions, vpMatrix}`.
     */
    subscribe_frame(cb: Function): void;
    unsubscribe_edges(idx: number): void;
    update_edges(edge_data: Float32Array, edge_count: number): void;
    update_positions(positions: Float32Array, flags: Uint8Array): void;
    /**
     * Multiplicative zoom around screen center.
     */
    zoom_in(): void;
    zoom_out(): void;
}

export function init(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_renderengine_free: (a: number, b: number) => void;
    readonly renderengine_create: (a: any) => [number, number, number];
    readonly renderengine_drain_worker_messages: (a: number) => any;
    readonly renderengine_frame: (a: number, b: number) => number;
    readonly renderengine_get_legend: (a: number) => any;
    readonly renderengine_handle_click: (a: number, b: number, c: number) => [number, number];
    readonly renderengine_handle_hover: (a: number, b: number, c: number) => [number, number];
    readonly renderengine_handle_node_drag_end: (a: number) => void;
    readonly renderengine_handle_node_drag_move: (a: number, b: number, c: number) => void;
    readonly renderengine_handle_node_drag_start: (a: number, b: number, c: number) => [number, number];
    readonly renderengine_handle_pan_end: (a: number) => void;
    readonly renderengine_handle_pan_move: (a: number, b: number, c: number) => void;
    readonly renderengine_handle_pan_start: (a: number, b: number, c: number) => void;
    readonly renderengine_handle_zoom: (a: number, b: number, c: number, d: number) => void;
    readonly renderengine_needs_frame: (a: number) => number;
    readonly renderengine_rehydrate: (a: number) => void;
    readonly renderengine_request_render: (a: number) => void;
    readonly renderengine_set_community_hulls: (a: number, b: number) => void;
    readonly renderengine_set_edge_metadata: (a: number, b: any, c: any) => [number, number];
    readonly renderengine_set_edge_type_keys: (a: number, b: number, c: number) => void;
    readonly renderengine_set_node_ids: (a: number, b: number, c: number) => void;
    readonly renderengine_set_node_metadata: (a: number, b: any, c: any, d: any) => [number, number];
    readonly renderengine_set_theme: (a: number, b: any) => [number, number];
    readonly renderengine_subscribe_edges: (a: number, b: any) => number;
    readonly renderengine_subscribe_frame: (a: number, b: any) => void;
    readonly renderengine_unsubscribe_edges: (a: number, b: number) => void;
    readonly renderengine_update_edges: (a: number, b: number, c: number, d: number) => void;
    readonly renderengine_update_positions: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly renderengine_debug_focus_state: (a: number) => any;
    readonly renderengine_fit: (a: number, b: number) => void;
    readonly renderengine_focus_fit: (a: number, b: number, c: number, d: number) => void;
    readonly renderengine_pan_to_node: (a: number, b: number, c: number) => void;
    readonly renderengine_set_focus: (a: number, b: number, c: number) => void;
    readonly renderengine_zoom_in: (a: number) => void;
    readonly renderengine_zoom_out: (a: number) => void;
    readonly init: () => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
