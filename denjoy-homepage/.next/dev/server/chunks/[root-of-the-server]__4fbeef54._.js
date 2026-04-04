module.exports = [
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/tags-manifest.external.js [external] (next/dist/server/lib/incremental-cache/tags-manifest.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/tags-manifest.external.js", () => require("next/dist/server/lib/incremental-cache/tags-manifest.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/denjoy-homepage/src/proxy.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "proxy",
    ()=>proxy
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/@supabase/ssr/dist/module/index.js [middleware] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/@supabase/ssr/dist/module/createServerClient.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/server.js [middleware] (ecmascript)");
;
;
async function proxy(request) {
    const { pathname } = request.nextUrl;
    // Nonce 생성 (CSP용)
    const nonce = crypto.randomUUID();
    request.headers.set("x-nonce", nonce);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/", request.url));
    }
    const supabaseResponse = __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next({
        request: {
            headers: request.headers
        }
    });
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["createServerClient"])(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll () {
                return request.cookies.getAll();
            },
            setAll (cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options })=>{
                    request.cookies.set(name, value);
                    supabaseResponse.cookies.set(name, value, options);
                });
            }
        }
    });
    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data.user;
    } catch  {
    // Supabase 연결 실패 시 비로그인으로 처리
    }
    // 비로그인 → 보호 라우트 접근 차단
    if (!user && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("redirect", pathname);
        return __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(url);
    }
    // 비관리자 → 관리자 라우트 접근 차단
    if (pathname.startsWith("/admin") && user) {
        const role = user.app_metadata?.role || user.user_metadata?.role;
        if (role !== "admin") {
            const url = request.nextUrl.clone();
            url.pathname = "/";
            return __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(url);
        }
    }
    // 동적 CSP 헤더 설정
    // Next.js 인라인 스크립트가 nonce를 자동 적용하지 않으므로 'unsafe-inline' 유지
    // 'unsafe-eval'만 제거하여 eval() 공격 차단
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://tally.so https://js.tosspayments.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
        "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://lh3.googleusercontent.com https://k.kakaocdn.net https://*.notion.so https://*.amazonaws.com",
        "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
        "connect-src 'self' https://*.supabase.co https://api.notion.com https://tally.so https://cdn.jsdelivr.net https://*.tosspayments.com",
        "frame-src https://tally.so https://*.tosspayments.com",
        "frame-ancestors 'none'"
    ].join("; ");
    supabaseResponse.headers.set("Content-Security-Policy", csp);
    return supabaseResponse;
}
const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
    ]
};
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__4fbeef54._.js.map