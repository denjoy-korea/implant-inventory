module.exports = [
"[project]/denjoy-homepage/src/app/favicon.ico.mjs { IMAGE => \"[project]/denjoy-homepage/src/app/favicon.ico (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/denjoy-homepage/src/app/favicon.ico.mjs { IMAGE => \"[project]/denjoy-homepage/src/app/favicon.ico (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript)"));
}),
"[project]/denjoy-homepage/src/app/apple-icon.png.mjs { IMAGE => \"[project]/denjoy-homepage/src/app/apple-icon.png (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/denjoy-homepage/src/app/apple-icon.png.mjs { IMAGE => \"[project]/denjoy-homepage/src/app/apple-icon.png (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript)"));
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/denjoy-homepage/src/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/denjoy-homepage/src/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/denjoy-homepage/src/app/error.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/denjoy-homepage/src/app/error.tsx [app-rsc] (ecmascript)"));
}),
"[project]/denjoy-homepage/src/app/loading.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/denjoy-homepage/src/app/loading.tsx [app-rsc] (ecmascript)"));
}),
"[project]/denjoy-homepage/src/app/not-found.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/denjoy-homepage/src/app/not-found.tsx [app-rsc] (ecmascript)"));
}),
"[project]/denjoy-homepage/src/lib/supabase-server.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createAdminClient",
    ()=>createAdminClient,
    "createClient",
    ()=>createClient,
    "requireAdmin",
    ()=>requireAdmin,
    "requireUser",
    ()=>requireUser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/@supabase/ssr/dist/module/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/@supabase/supabase-js/dist/index.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/server.js [app-rsc] (ecmascript)");
;
;
;
;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function createClient() {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
    }
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    // 프로덕션에서 .denjoy.info 도메인 공유 → inventory.denjoy.info 자동 SSO
    const cookieDomain = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : undefined;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            setAll (cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options })=>{
                        cookieStore.set(name, value, {
                            ...options,
                            ...("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : {}
                        });
                    });
                } catch  {
                // Server Component에서 호출 시 무시
                }
            }
        }
    });
}
async function requireUser() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return {
                user: null,
                error: __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "인증이 필요합니다. 로그인 후 다시 시도해주세요."
                }, {
                    status: 401
                })
            };
        }
        return {
            user,
            error: null
        };
    } catch  {
        return {
            user: null,
            error: __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "인증 처리 중 오류가 발생했습니다."
            }, {
                status: 500
            })
        };
    }
}
async function requireAdmin() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return {
                user: null,
                error: __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "인증이 필요합니다. 로그인 후 다시 시도해주세요."
                }, {
                    status: 401
                })
            };
        }
        if (user.app_metadata?.role !== "admin" && user.user_metadata?.role !== "admin") {
            return {
                user: null,
                error: __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "관리자 권한이 필요합니다."
                }, {
                    status: 403
                })
            };
        }
        return {
            user,
            error: null
        };
    } catch  {
        return {
            user: null,
            error: __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "인증 처리 중 오류가 발생했습니다."
            }, {
                status: 500
            })
        };
    }
}
function createAdminClient() {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error("Supabase Admin 환경변수가 설정되지 않았습니다.");
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseServiceRoleKey);
}
}),
"[project]/denjoy-homepage/src/lib/supabase-courses.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getCourse",
    ()=>getCourse,
    "getCourseBySlug",
    ()=>getCourseBySlug,
    "getCourses",
    ()=>getCourses,
    "getQuestionsByCourse",
    ()=>getQuestionsByCourse,
    "getRegistrationCountByCourseName",
    ()=>getRegistrationCountByCourseName,
    "getRegistrationsByEmail",
    ()=>getRegistrationsByEmail,
    "getReviewsByCourse",
    ()=>getReviewsByCourse,
    "getSessionsByCourse",
    ()=>getSessionsByCourse
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$supabase$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/lib/supabase-server.ts [app-rsc] (ecmascript)");
;
async function getCourses() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$supabase$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data, error } = await supabase.from('courses').select('id, title, description, price, duration, level, category, status, is_public, thumbnail_url, slug, tags').eq('is_public', true).order('created_at', {
        ascending: false
    });
    if (error) {
        console.error('강의 목록 조회 실패:', error);
        return [];
    }
    return (data ?? []).map((row)=>({
            id: row.id,
            title: row.title || '제목 없음',
            description: row.description || '',
            price: row.price || 0,
            duration: row.duration || '',
            level: row.level || '입문',
            category: row.category || '',
            status: row.status || '',
            thumbnail: row.thumbnail_url || '',
            slug: row.slug || row.id,
            tags: row.tags || []
        }));
}
async function getCourseBySlug(slug) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$supabase$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data, error } = await supabase.from('courses').select('id, title, status').eq('slug', slug).single();
    if (error || !data) return null;
    return {
        id: data.id,
        title: data.title,
        status: data.status
    };
}
async function getCourse(idOrSlug) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$supabase$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    // UUID 형식이면 id로, 아니면 slug로 조회
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const { data, error } = await supabase.from('courses').select('*').eq(isUuid ? 'id' : 'slug', idOrSlug).single();
    if (error || !data) return null;
    if (!data.is_public) return null;
    return {
        id: data.id,
        title: data.title,
        description: data.description || '',
        price: data.price || 0,
        duration: data.duration || '',
        level: data.level || '입문',
        category: data.category || '',
        format: data.format || '',
        status: data.status || '',
        thumbnail: data.thumbnail_url || '',
        location: data.location || '',
        applyLink: data.apply_link || '',
        maxCapacity: data.max_capacity || 0,
        tags: data.tags || [],
        content: data.content || []
    };
}
async function getSessionsByCourse(courseId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$supabase$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data, error } = await supabase.from('sessions').select('*').eq('course_id', courseId).eq('is_public', true).order('start_date', {
        ascending: true
    });
    if (error) {
        console.error('회차 조회 실패:', error);
        return [];
    }
    return (data ?? []).map((row)=>{
        const dates = Array.isArray(row.additional_dates) ? row.additional_dates : [];
        if (dates.length === 0 && row.start_date) {
            dates.push({
                start: row.start_date,
                end: row.end_date || row.start_date
            });
        }
        return {
            id: row.id,
            title: row.title,
            courseDate: row.start_date || '',
            courseDateEnd: row.end_date || '',
            dates,
            location: row.location || '',
            maxCapacity: row.max_capacity,
            currentCapacity: row.current_capacity,
            applyLink: row.apply_link || '',
            status: row.status,
            isPublic: row.is_public
        };
    });
}
async function getReviewsByCourse(courseId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$supabase$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data, error } = await supabase.from('reviews').select('*').eq('course_id', courseId).order('created_at', {
        ascending: false
    });
    if (error) return [];
    return (data ?? []).map((row)=>({
            id: row.id,
            title: row.title,
            authorName: row.author_name || '',
            rating: row.rating || 0,
            content: row.content || '',
            date: row.written_date || ''
        }));
}
async function getQuestionsByCourse(courseId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$supabase$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data, error } = await supabase.from('course_questions').select('*').eq('course_id', courseId).order('created_at', {
        ascending: false
    });
    if (error) return [];
    return (data ?? []).map((row)=>({
            id: row.id,
            question: row.question,
            authorName: row.author_name || '',
            answer: row.answer || '',
            date: row.written_date || ''
        }));
}
async function getRegistrationsByEmail(email) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$supabase$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data, error } = await supabase.from('registrations').select('*').eq('email', email).order('applied_at', {
        ascending: false
    });
    if (error) return [];
    return (data ?? []).map((row)=>({
            id: row.id,
            name: row.name,
            email: row.email,
            courseName: row.course_name,
            price: String(row.course_price || 0),
            status: row.status || '신청완료',
            phone: row.phone || '',
            appliedAt: row.applied_at || row.created_at,
            paymentStatus: row.payment_status || ''
        }));
}
async function getRegistrationCountByCourseName(courseName) {
    if (!courseName) return 0;
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$supabase$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { count, error } = await supabase.from('registrations').select('*', {
        count: 'exact',
        head: true
    }).eq('course_name', courseName).neq('status', '취소');
    if (error) return 0;
    return count ?? 0;
}
}),
"[project]/denjoy-homepage/src/components/home/HeroSection.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>HeroSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/image.js [app-rsc] (ecmascript)");
;
;
;
function HeroSection() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "relative pt-32 pb-24 overflow-hidden",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-6xl mx-auto px-6 lg:px-8",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center max-w-5xl mx-auto",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm animate-fade-in-up",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "relative flex h-2.5 w-2.5",
                                "aria-hidden": "true",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                                        lineNumber: 11,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                                        lineNumber: 12,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                                lineNumber: 10,
                                columnNumber: 15
                            }, this),
                            "브랜드 홈페이지와 솔루션 랜딩을 분리한 DenJOY 메인 구조"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                        lineNumber: 9,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-8 animate-fade-in-up animate-delay-100",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                            src: "/logo-new.png",
                            alt: "DenJOY 로고",
                            width: 160,
                            height: 160,
                            className: "mx-auto w-28 md:w-36 h-auto",
                            priority: true
                        }, void 0, false, {
                            fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                            lineNumber: 18,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                        lineNumber: 17,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "mt-6 font-black tracking-tight leading-[0.92] animate-fade-in-up animate-delay-100",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "block text-4xl sm:text-6xl md:text-7xl text-gray-800",
                                children: "교육이 있고, 컨설팅이 있고,"
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                                lineNumber: 29,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "block text-4xl sm:text-6xl md:text-7xl gradient-text glow-text",
                                children: "솔루션이 있는 DenJOY"
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                                lineNumber: 30,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                        lineNumber: 28,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-6 max-w-3xl mx-auto text-lg md:text-xl text-gray-500 leading-relaxed animate-fade-in-up animate-delay-200",
                        children: "메인 홈페이지에서는 DenJOY가 무엇을 하는지 먼저 설명하고, 각 솔루션은 다시 자기만의 랜딩페이지에서 더 깊게 전환을 담당합니다. 지금 운영 중인 솔루션은 임플란트 재고관리부터 시작합니다."
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                        lineNumber: 35,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-8 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animate-delay-300",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                href: "/contact",
                                className: "btn-primary text-lg",
                                children: "무료 상담 신청하기"
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                                lineNumber: 42,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                href: "/solutions",
                                className: "btn-secondary text-lg",
                                children: "솔루션 구조 보기"
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                                lineNumber: 45,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                        lineNumber: 41,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up animate-delay-300",
                        children: [
                            {
                                label: "교육",
                                value: "강의와 매뉴얼"
                            },
                            {
                                label: "컨설팅",
                                value: "병원 운영 진단"
                            },
                            {
                                label: "솔루션",
                                value: "랜딩별 분기 구조"
                            }
                        ].map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "card-premium glow-box text-center py-5 px-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
                                        children: item.label
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                                        lineNumber: 57,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-2 text-sm sm:text-base font-semibold text-gray-800",
                                        children: item.value
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                                        lineNumber: 58,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, item.label, true, {
                                fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                                lineNumber: 56,
                                columnNumber: 17
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                        lineNumber: 50,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-16 relative animate-fade-in-up animate-delay-400",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    perspective: "1000px"
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "relative rounded-2xl bg-slate-900/5 p-2 ring-1 ring-slate-900/10 shadow-2xl transition-transform duration-700 hover:[transform:rotateX(0deg)]",
                                    style: {
                                        transform: "rotateX(5deg)",
                                        transformOrigin: "center top"
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rounded-xl overflow-hidden border border-slate-200/50",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                            src: "/images/inventory-dashboard.png",
                                            alt: "DenJOY 솔루션 대시보드 미리보기",
                                            width: 1200,
                                            height: 750,
                                            className: "w-full h-auto",
                                            priority: true
                                        }, void 0, false, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                                            lineNumber: 70,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                                        lineNumber: 69,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                                    lineNumber: 65,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                                lineNumber: 64,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute -inset-4 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-[2rem] blur-2xl opacity-10 -z-10",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                                lineNumber: 81,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                        lineNumber: 63,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
                lineNumber: 8,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
            lineNumber: 7,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/home/HeroSection.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, this);
}
}),
"[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PainPointsSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
;
const PAIN_POINTS = [
    {
        title: "재고 파악 지연",
        pain: "임플란트 재고가 얼마나 남았는지 몰라 수술 전에 다시 확인하느라 현장이 흔들리는 문제",
        tag: "재고관리"
    },
    {
        title: "보험청구 누락",
        pain: "청구 누락 여부를 사람이 일일이 점검하다 보니 놓치는 금액이 계속 쌓이는 문제",
        tag: "보험청구"
    },
    {
        title: "HR 기준 부재",
        pain: "근태, 계약, 교육 기준이 병원마다 달라 운영 방식이 사람에 따라 흔들리는 문제",
        tag: "인사관리"
    },
    {
        title: "대표 의존 운영",
        pain: "원장이나 실장 한 명이 빠지면 프로세스가 멈추는 식의 운영 구조",
        tag: "운영시스템"
    }
];
function PainPointsSection() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "py-24 relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-divider mb-24"
            }, void 0, false, {
                fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                lineNumber: 27,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-7xl mx-auto px-6 lg:px-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center mb-12 animate-fade-in-up",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-rose-500 font-medium mb-3",
                                children: "PAIN POINTS"
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                                lineNumber: 30,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-4",
                                children: [
                                    "메인 홈페이지가 필요한 이유는,",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "block text-red-500",
                                        children: "문제가 하나가 아니기 때문입니다."
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                                        lineNumber: 33,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                                lineNumber: 31,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-gray-500 text-base md:text-lg max-w-3xl mx-auto",
                                children: "DenJOY 메인 홈페이지는 병원이 겪는 문제 전체를 먼저 보여주고, 각 문제는 다시 전용 솔루션 랜딩으로 이어집니다."
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                                lineNumber: 35,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                        lineNumber: 29,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5",
                        children: PAIN_POINTS.map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "card-premium glow-box hover:border-rose-200 hover:shadow-rose-100/50 hover:-translate-y-1 transition-all duration-300",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-sm mb-4",
                                        children: String(i + 1).padStart(2, "0")
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                                        lineNumber: 46,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-lg font-bold text-gray-800 mb-2",
                                        children: item.title
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                                        lineNumber: 49,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-gray-500 leading-relaxed mb-4",
                                        children: item.pain
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                                        lineNumber: 50,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100",
                                        children: item.tag
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                                        lineNumber: 51,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, i, true, {
                                fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                                lineNumber: 42,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                        lineNumber: 40,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center mt-10",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-lg text-gray-600",
                            children: [
                                "이 중 하나라도 해당된다면, ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-indigo-600 font-semibold",
                                    children: "브랜드 홈페이지에서 구조를 보고 각 솔루션 랜딩에서 바로 검토할 수 있어야 합니다."
                                }, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                                    lineNumber: 60,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                            lineNumber: 59,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                        lineNumber: 58,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
                lineNumber: 28,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx",
        lineNumber: 26,
        columnNumber: 5
    }, this);
}
}),
"[project]/denjoy-homepage/src/components/home/StatsSection.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call the default export of [project]/denjoy-homepage/src/components/home/StatsSection.tsx <module evaluation> from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/denjoy-homepage/src/components/home/StatsSection.tsx <module evaluation>", "default");
}),
"[project]/denjoy-homepage/src/components/home/StatsSection.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call the default export of [project]/denjoy-homepage/src/components/home/StatsSection.tsx from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/denjoy-homepage/src/components/home/StatsSection.tsx", "default");
}),
"[project]/denjoy-homepage/src/components/home/StatsSection.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$StatsSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/home/StatsSection.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$StatsSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/home/StatsSection.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$StatsSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/denjoy-homepage/src/components/icons/index.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * 공통 SVG 아이콘 컴포넌트
 * - 모든 아이콘은 aria-hidden="true" 기본 적용 (장식용)
 * - className으로 크기/색상 커스터마이징
 */ __turbopack_context__.s([
    "ArrowRightIcon",
    ()=>ArrowRightIcon,
    "ArrowRightSmallIcon",
    ()=>ArrowRightSmallIcon,
    "BookOpenIcon",
    ()=>BookOpenIcon,
    "BoxIcon",
    ()=>BoxIcon,
    "ChartBarIcon",
    ()=>ChartBarIcon,
    "CheckIcon",
    ()=>CheckIcon,
    "ChevronDownIcon",
    ()=>ChevronDownIcon,
    "ClockIcon",
    ()=>ClockIcon,
    "CurrencyIcon",
    ()=>CurrencyIcon,
    "ExternalLinkIcon",
    ()=>ExternalLinkIcon,
    "MailIcon",
    ()=>MailIcon,
    "StarIcon",
    ()=>StarIcon,
    "UsersIcon",
    ()=>UsersIcon,
    "VideoIcon",
    ()=>VideoIcon
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
;
function ArrowRightIcon({ className = "w-5 h-5" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        className: className,
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 2,
            d: "M17 8l4 4m0 0l-4 4m4-4H3"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
            lineNumber: 14,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
function ArrowRightSmallIcon({ className = "w-4 h-4" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        className: className,
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 2,
            d: "M9 5l7 7-7 7"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
            lineNumber: 22,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
        lineNumber: 21,
        columnNumber: 5
    }, this);
}
function CheckIcon({ className = "w-5 h-5 text-green-500 shrink-0 mt-0.5" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        className: className,
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 2,
            d: "M5 13l4 4L19 7"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
            lineNumber: 30,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
        lineNumber: 29,
        columnNumber: 5
    }, this);
}
function ChartBarIcon({ className = "w-6 h-6" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        className: className,
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 1.5,
            d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
            lineNumber: 38,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
        lineNumber: 37,
        columnNumber: 5
    }, this);
}
function BookOpenIcon({ className = "w-6 h-6" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        className: className,
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 1.5,
            d: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
            lineNumber: 46,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
        lineNumber: 45,
        columnNumber: 5
    }, this);
}
function BoxIcon({ className = "w-6 h-6" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        className: className,
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 1.5,
            d: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
            lineNumber: 54,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
        lineNumber: 53,
        columnNumber: 5
    }, this);
}
function UsersIcon({ className = "w-6 h-6" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        className: className,
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 1.5,
            d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
            lineNumber: 62,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
        lineNumber: 61,
        columnNumber: 5
    }, this);
}
function MailIcon({ className = "w-6 h-6" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        className: className,
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 1.5,
            d: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
            lineNumber: 70,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
        lineNumber: 69,
        columnNumber: 5
    }, this);
}
function VideoIcon({ className = "w-6 h-6" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        className: className,
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 1.5,
            d: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
            lineNumber: 78,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
        lineNumber: 77,
        columnNumber: 5
    }, this);
}
function ClockIcon({ className = "w-4 h-4 text-orange-500" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        className: className,
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 2,
            d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
            lineNumber: 86,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
        lineNumber: 85,
        columnNumber: 5
    }, this);
}
function ExternalLinkIcon({ className = "w-4 h-4" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        className: className,
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 2,
            d: "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
            lineNumber: 94,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
        lineNumber: 93,
        columnNumber: 5
    }, this);
}
function ChevronDownIcon({ className = "w-4 h-4 text-gray-500" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        className: className,
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 2,
            d: "M19 9l-7 7-7-7"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
            lineNumber: 102,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
        lineNumber: 101,
        columnNumber: 5
    }, this);
}
function StarIcon({ className = "w-5 h-5 text-yellow-400" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: className,
        fill: "currentColor",
        viewBox: "0 0 20 20",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
            lineNumber: 110,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
        lineNumber: 109,
        columnNumber: 5
    }, this);
}
function CurrencyIcon({ className = "w-6 h-6" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": "true",
        className: className,
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 1.5,
            d: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
            lineNumber: 118,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/icons/index.tsx",
        lineNumber: 117,
        columnNumber: 5
    }, this);
}
}),
"[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>FourPillarsSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$icons$2f$index$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/icons/index.tsx [app-rsc] (ecmascript)");
;
;
;
const PILLARS = [
    {
        short: "EDU",
        title: "실전 교육",
        description: "현장에서 바로 적용할 수 있는 임상 지식과 데이터 도구 활용법을 배웁니다.",
        href: "/courses",
        linkText: "강의 보기",
        badge: null,
        highlight: false
    },
    {
        short: "CONS",
        title: "병원 컨설팅",
        description: "운영 문제를 구조화하고 시스템 도입 우선순위를 병원 상황에 맞게 정리합니다.",
        href: "/consulting",
        linkText: "컨설팅 알아보기",
        badge: "추천",
        highlight: true
    },
    {
        short: "SOL",
        title: "솔루션",
        description: "재고관리, 보험청구, 인사관리 등 필요한 솔루션이 각자의 랜딩페이지로 분기됩니다.",
        href: "/solutions",
        linkText: "솔루션 보기",
        badge: "NEW",
        highlight: false
    },
    {
        short: "COMM",
        title: "성장 커뮤니티",
        description: "같은 목표를 가진 동료들과 경험을 나누며 함께 성장하는 네트워크입니다.",
        href: "/community",
        linkText: "커뮤니티 참여하기",
        badge: null,
        highlight: false
    }
];
function FourPillarsSection() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "py-24 relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-divider mb-24"
            }, void 0, false, {
                fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                lineNumber: 46,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-7xl mx-auto px-6 lg:px-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center mb-20",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-indigo-500 font-medium mb-2",
                                children: "FOUR PILLARS"
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                lineNumber: 49,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-gray-800",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "gradient-text-purple",
                                        children: "DenJOY"
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                        lineNumber: 51,
                                        columnNumber: 13
                                    }, this),
                                    " 메인 홈페이지는",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "block",
                                        children: "이 네 축으로 설명됩니다"
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                        lineNumber: 52,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                lineNumber: 50,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed",
                                children: "메인 브랜드 메시지를 먼저 설명한 뒤, 필요한 영역은 각 페이지와 솔루션 랜딩으로 더 깊게 연결하는 구조입니다."
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                lineNumber: 54,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                        lineNumber: 48,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8",
                        children: PILLARS.map((pillar, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                href: pillar.href,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: `group h-full cursor-pointer transition-all duration-300 ${pillar.highlight ? "rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-600 p-8 text-white shadow-xl shadow-indigo-500/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/30 ring-2 ring-indigo-300/50" : "card-premium glow-box hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200"}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-start justify-between mb-6",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: `${pillar.highlight ? "w-14 h-14 rounded-2xl bg-white/15 text-white" : "icon-wrapper text-indigo-500"} flex items-center justify-center text-sm font-black tracking-[0.2em] group-hover:scale-110 transition-transform`,
                                                    children: pillar.short
                                                }, void 0, false, {
                                                    fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                                    lineNumber: 68,
                                                    columnNumber: 19
                                                }, this),
                                                pillar.badge && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: `px-2.5 py-1 rounded-full text-xs font-bold ${pillar.highlight ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"}`,
                                                    children: pillar.badge
                                                }, void 0, false, {
                                                    fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                                    lineNumber: 72,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                            lineNumber: 67,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: `text-xl font-semibold mb-3 ${pillar.highlight ? "text-white" : "text-gray-800"}`,
                                            children: pillar.title
                                        }, void 0, false, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                            lineNumber: 81,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: `leading-relaxed mb-4 ${pillar.highlight ? "text-indigo-100" : "text-gray-500"}`,
                                            children: pillar.description
                                        }, void 0, false, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                            lineNumber: 84,
                                            columnNumber: 17
                                        }, this),
                                        pillar.highlight && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-indigo-200 mb-4",
                                            children: "메인 홈페이지에서 구조를 이해하고 필요한 솔루션으로 진입합니다."
                                        }, void 0, false, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                            lineNumber: 88,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: `flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${pillar.highlight ? "text-indigo-200 group-hover:text-white" : "text-indigo-500 group-hover:text-indigo-600"}`,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: pillar.linkText
                                                }, void 0, false, {
                                                    fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                                    lineNumber: 93,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$icons$2f$index$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ArrowRightSmallIcon"], {
                                                    className: "w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
                                                }, void 0, false, {
                                                    fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                                    lineNumber: 94,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                            lineNumber: 90,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                    lineNumber: 62,
                                    columnNumber: 15
                                }, this)
                            }, i, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                                lineNumber: 61,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                        lineNumber: 59,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx",
        lineNumber: 45,
        columnNumber: 5
    }, this);
}
}),
"[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SolutionShowcaseSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/image.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$icons$2f$index$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/icons/index.tsx [app-rsc] (ecmascript)");
;
;
;
;
const FEATURES = [
    "사용량 기반 안전재고 자동 설정 → 발주 목록·수량 자동 생성",
    "덴트웹 최적화로 페일 픽스쳐·보험 2단계 청구 데이터까지 수집",
    "보험 임플란트 청구 동향 및 품목별 KPI 보고",
    "재고 실사로 누수 차단, 페일 제품 맞춤 교환 추천",
    "영업사원에게 복사·붙여넣기로 즉시 주문 → 입고까지 관리"
];
const COMING_SOON = [
    {
        title: "보험청구 관리",
        status: "준비중"
    },
    {
        title: "매출 분석",
        status: "준비중"
    },
    {
        title: "일반재료 관리",
        status: "준비중"
    },
    {
        title: "인사관리",
        status: "준비중"
    }
];
function SolutionShowcaseSection() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "py-24 relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-divider mb-24"
            }, void 0, false, {
                fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-7xl mx-auto px-6 lg:px-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center mb-16",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 mb-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "w-2 h-2 bg-green-500 rounded-full animate-pulse",
                                        "aria-hidden": "true"
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                        lineNumber: 27,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm text-green-700 font-medium",
                                        children: "지금 바로 사용 가능"
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                        lineNumber: 28,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                lineNumber: 26,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-4xl md:text-5xl font-bold mb-4 text-gray-800",
                                children: [
                                    "홈페이지 안에 솔루션이 있고,",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "block gradient-text-purple",
                                        children: "솔루션마다 자기 랜딩이 있습니다."
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                        lineNumber: 32,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                lineNumber: 30,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed",
                                children: "메인 홈페이지는 전체 솔루션 구조를 설명하고, 실제 전환은 각 솔루션의 독립 랜딩페이지에서 일어나도록 설계합니다."
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                lineNumber: 34,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                        lineNumber: 25,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "card-premium glow-box overflow-hidden",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col lg:flex-row items-center gap-10 p-8 lg:p-12",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200 mb-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "w-1.5 h-1.5 bg-green-500 rounded-full",
                                                    "aria-hidden": "true"
                                                }, void 0, false, {
                                                    fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                                    lineNumber: 43,
                                                    columnNumber: 17
                                                }, this),
                                                "LIVE"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                            lineNumber: 42,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-2xl md:text-3xl font-bold text-gray-800 mb-3",
                                            children: "임플란트 재고관리 시스템"
                                        }, void 0, false, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                            lineNumber: 46,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-gray-500 leading-relaxed mb-2",
                                            children: [
                                                "현재 운영 중인 첫 번째 솔루션 랜딩입니다.",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-red-500 font-medium",
                                                    children: " 메인 홈페이지에서 여기로 분기되어 더 자세한 설명과 전환을 맡습니다."
                                                }, void 0, false, {
                                                    fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                                    lineNumber: 51,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                            lineNumber: 49,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-gray-600 leading-relaxed mb-6",
                                            children: [
                                                "사용량 기반으로 ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-indigo-600 font-semibold",
                                                    children: "적정 안전 재고를 설정"
                                                }, void 0, false, {
                                                    fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                                    lineNumber: 54,
                                                    columnNumber: 26
                                                }, this),
                                                "하고, 이 수치를 기준으로 주문 목록·수량이 자동 생성됩니다. 재고를 세는 시간 대신, 진짜 중요한 일에 집중하세요."
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                            lineNumber: 53,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                            className: "space-y-3 mb-8",
                                            children: FEATURES.map((feature, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                    className: "flex items-start gap-3 text-gray-600",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$icons$2f$index$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CheckIcon"], {}, void 0, false, {
                                                            fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                                            lineNumber: 60,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-sm leading-relaxed",
                                                            children: feature
                                                        }, void 0, false, {
                                                            fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                                            lineNumber: 61,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, i, true, {
                                                    fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                                    lineNumber: 59,
                                                    columnNumber: 19
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                            lineNumber: 57,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-col sm:flex-row gap-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    href: "https://inventory.denjoy.info",
                                                    target: "_blank",
                                                    rel: "noopener noreferrer",
                                                    "aria-label": "임플란트 재고관리 시스템 사용해보기 - 새 탭에서 열림",
                                                    className: "btn-primary",
                                                    children: [
                                                        "랜딩페이지 열기",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$icons$2f$index$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ExternalLinkIcon"], {
                                                            className: "w-4 h-4",
                                                            "aria-hidden": "true"
                                                        }, void 0, false, {
                                                            fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                                            lineNumber: 69,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                                    lineNumber: 67,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                                    href: "/solutions",
                                                    className: "btn-secondary",
                                                    children: "전체 솔루션 보기"
                                                }, void 0, false, {
                                                    fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                                    lineNumber: 71,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                            lineNumber: 66,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                    lineNumber: 41,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1 w-full",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "relative rounded-2xl overflow-hidden shadow-lg border border-gray-200",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                            src: "/images/inventory-dashboard.png",
                                            alt: "임플란트 재고관리 시스템 대시보드 - 월별 추세, 요일별 패턴, 식립 추세, 제조사 분석",
                                            width: 960,
                                            height: 1200,
                                            className: "w-full h-auto"
                                        }, void 0, false, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                            lineNumber: 79,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                        lineNumber: 78,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                    lineNumber: 77,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                            lineNumber: 40,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                        lineNumber: 39,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-2 md:grid-cols-4 gap-4 mt-8",
                        children: COMING_SOON.map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 text-center",
                                "aria-hidden": "true",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm font-medium text-gray-600",
                                        children: item.title
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                        lineNumber: 95,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-gray-500 mt-1",
                                        children: item.status
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                        lineNumber: 96,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, i, true, {
                                fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                                lineNumber: 94,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                        lineNumber: 92,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
}),
"[project]/denjoy-homepage/src/lib/course-constants.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CLINICAL_EDUCATION_COUNT",
    ()=>CLINICAL_EDUCATION_COUNT,
    "RATING",
    ()=>RATING,
    "SATISFACTION_RATE",
    ()=>SATISFACTION_RATE,
    "STATS",
    ()=>STATS,
    "TOTAL_STUDENTS",
    ()=>TOTAL_STUDENTS,
    "careerYears",
    ()=>careerYears,
    "levelEmoji",
    ()=>levelEmoji,
    "statusColor",
    ()=>statusColor,
    "statusStyle",
    ()=>statusStyle,
    "testimonials",
    ()=>testimonials
]);
/** DenJOY 브랜드 공통 상수 */ /** 창업 연도 (경력 계산 기준) */ const FOUNDED_YEAR = 2007;
const careerYears = new Date().getFullYear() - FOUNDED_YEAR;
const CLINICAL_EDUCATION_COUNT = 100;
const TOTAL_STUDENTS = '1,000+';
const SATISFACTION_RATE = '98%';
const RATING = '4.9/5.0';
const STATS = [
    {
        number: TOTAL_STUDENTS,
        label: '누적 수강생',
        sub: '전국 치과위생사',
        rawNum: 1000,
        suffix: '+'
    },
    {
        number: `${careerYears}년`,
        label: '현장 경력',
        sub: `${FOUNDED_YEAR}년부터`,
        rawNum: careerYears,
        suffix: '년'
    },
    {
        number: SATISFACTION_RATE,
        label: '수강 만족도',
        sub: '업계 평균 대비 +23%',
        rawNum: 98,
        suffix: '%'
    },
    {
        number: `${CLINICAL_EDUCATION_COUNT}+`,
        label: '임상교육 횟수',
        sub: '대학·병원·학회',
        rawNum: CLINICAL_EDUCATION_COUNT,
        suffix: '+'
    }
];
const levelEmoji = {
    '입문': '🚀',
    '초급': '📚',
    '중급': '📖',
    '고급': '🎯',
    '마스터': '🎓'
};
const statusColor = {
    '모집중': 'bg-green-50 text-green-700 border border-green-200',
    '진행중': 'bg-blue-50 text-blue-700 border border-blue-200',
    '준비중': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    '마감': 'bg-red-50 text-red-600 border border-red-200',
    '완료': 'bg-gray-100 text-gray-500 border border-gray-200'
};
const statusStyle = {
    '모집중': 'bg-green-100 text-green-700',
    '진행중': 'bg-blue-100 text-blue-700',
    '준비중': 'bg-yellow-100 text-yellow-700',
    '마감': 'bg-red-100 text-red-700',
    '완료': 'bg-gray-100 text-gray-500'
};
const testimonials = [
    {
        name: "김OO",
        role: "OO치과 대표원장",
        content: "실무에 바로 적용할 수 있는 내용이라 정말 유익했습니다. 다른 강의와 확실히 다른 점은 실전 위주라는 것입니다.",
        rating: 5
    },
    {
        name: "이OO",
        role: "치과위생사 7년차",
        content: "소수 정예로 진행되어 질문도 편하게 할 수 있었고, 강사님의 피드백이 매우 구체적이었습니다.",
        rating: 5
    },
    {
        name: "박OO",
        role: "OO치과 부원장",
        content: "커뮤니티에서 동료들과 케이스를 공유하며 계속 성장할 수 있다는 점이 가장 좋았습니다.",
        rating: 5
    }
];
}),
"[project]/denjoy-homepage/src/lib/utils.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * 이름 마스킹 (중간 글자를 *로 대체)
 * "김철수" → "김*수", "홍길동" → "홍*동"
 */ __turbopack_context__.s([
    "buildAuthorName",
    ()=>buildAuthorName,
    "createRateLimiter",
    ()=>createRateLimiter,
    "formatAuthorName",
    ()=>formatAuthorName,
    "formatDate",
    ()=>formatDate,
    "formatDateLong",
    ()=>formatDateLong,
    "formatPrice",
    ()=>formatPrice,
    "getClientIp",
    ()=>getClientIp,
    "isValidNotionId",
    ()=>isValidNotionId,
    "isValidOrigin",
    ()=>isValidOrigin,
    "maskName",
    ()=>maskName,
    "parsePrice",
    ()=>parsePrice,
    "slugToPageId",
    ()=>slugToPageId
]);
function maskName(name) {
    if (!name) return "";
    if (name.length <= 1) return name;
    if (name.length === 2) return name[0] + "*";
    return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}
function formatAuthorName(authorName) {
    if (!authorName) return "";
    if (authorName.startsWith("@")) {
        return authorName.slice(1);
    }
    return maskName(authorName);
}
function buildAuthorName(name, nickname) {
    if (nickname) return `@${nickname}`;
    return name || "익명";
}
function formatDate(dateStr, fallback = "-") {
    if (!dateStr) return fallback;
    return new Date(dateStr).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
}
function formatDateLong(dateStr, fallback = "") {
    if (!dateStr) return fallback;
    return new Date(dateStr).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}
function formatPrice(price) {
    return price.toLocaleString("ko-KR");
}
function parsePrice(value) {
    const numericValue = value.replace(/[^0-9]/g, "");
    return numericValue ? parseInt(numericValue, 10) : 0;
}
function slugToPageId(slug) {
    if (slug.includes("-")) return slug;
    return [
        slug.slice(0, 8),
        slug.slice(8, 12),
        slug.slice(12, 16),
        slug.slice(16, 20),
        slug.slice(20)
    ].join("-");
}
/**
 * Notion Page ID UUID 형식 검증
 * 하이픈 있는/없는 UUID 모두 허용
 */ const UUID_REGEX = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
function isValidNotionId(id) {
    return UUID_REGEX.test(id);
}
function createRateLimiter(maxRequests, windowMs) {
    // fallback in-memory store
    const g = globalThis;
    if (!g.__rateLimiters) g.__rateLimiters = new Map();
    const storeKey = `${maxRequests}:${windowMs}`;
    if (!g.__rateLimiters.has(storeKey)) g.__rateLimiters.set(storeKey, new Map());
    const memStore = g.__rateLimiters.get(storeKey);
    return async function isRateLimited(limiterKey) {
        // Lazy import to avoid top-level side effects
        const { redis } = await __turbopack_context__.A("[project]/denjoy-homepage/src/lib/redis.ts [app-rsc] (ecmascript, async loader)");
        if (redis) {
            const windowSec = Math.ceil(windowMs / 1000);
            const bucket = Math.floor(Date.now() / windowMs);
            const key = `rl:${storeKey}:${limiterKey}:${bucket}`;
            const count = await redis.incr(key);
            if (count === 1) await redis.expire(key, windowSec);
            return count > maxRequests;
        }
        // fallback: in-memory
        const now = Date.now();
        const timestamps = memStore.get(limiterKey) ?? [];
        const recent = timestamps.filter((t)=>now - t < windowMs);
        memStore.set(limiterKey, recent);
        if (recent.length >= maxRequests) return true;
        recent.push(now);
        memStore.set(limiterKey, recent);
        return false;
    };
}
function getClientIp(request) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return request.headers.get("x-real-ip") ?? "unknown";
}
function isValidOrigin(request) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (!origin || !host) return false;
    try {
        const originHost = new URL(origin).host;
        return originHost === host;
    } catch  {
        return false;
    }
}
}),
"[project]/denjoy-homepage/src/components/CourseCard.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CourseCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/image.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$course$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/lib/course-constants.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/lib/utils.ts [app-rsc] (ecmascript)");
;
;
;
;
;
function CourseCard({ course }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
        href: `/courses/${course.slug}`,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full cursor-pointer group hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50 hover:-translate-y-1 transition-all duration-300",
            children: [
                course.thumbnail ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative h-44",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                        src: course.thumbnail,
                        alt: course.title,
                        fill: true,
                        className: "object-cover group-hover:scale-105 transition-transform duration-300"
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                        lineNumber: 25,
                        columnNumber: 25
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                    lineNumber: 24,
                    columnNumber: 21
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-4xl text-center py-6 bg-slate-50 border-b border-slate-100 group-hover:bg-indigo-50/50 transition-colors duration-300",
                    children: __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$course$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["levelEmoji"][course.level] || '📚'
                }, void 0, false, {
                    fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                    lineNumber: 33,
                    columnNumber: 21
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-wrap items-center gap-2 mb-3",
                            children: [
                                course.status && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: `px-2.5 py-0.5 rounded-full text-xs font-semibold ${__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$course$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["statusColor"][course.status] || 'bg-gray-100 text-gray-500 border border-gray-200'}`,
                                    children: course.status
                                }, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                                    lineNumber: 41,
                                    columnNumber: 29
                                }, this),
                                course.category && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs text-slate-400 font-medium",
                                    children: course.category
                                }, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                                    lineNumber: 46,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                            lineNumber: 39,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "text-base font-bold text-slate-800 mb-1",
                            children: course.title
                        }, void 0, false, {
                            fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                            lineNumber: 50,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3",
                            children: [
                                course.level,
                                " LEVEL"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                            lineNumber: 51,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-gray-500 mb-4 text-sm leading-relaxed line-clamp-2",
                            children: course.description
                        }, void 0, false, {
                            fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                            lineNumber: 55,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-between items-center pt-4 border-t border-slate-100",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-indigo-600 font-bold text-base",
                                    children: course.price > 0 ? `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatPrice"])(course.price)}원` : "무료"
                                }, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                                    lineNumber: 58,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-slate-400 text-xs",
                                    children: course.duration
                                }, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                                    lineNumber: 61,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                            lineNumber: 57,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-3 flex items-center gap-1.5 text-sm text-indigo-500 font-medium group-hover:text-indigo-600 transition-colors duration-200",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "자세히 보기"
                                }, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                                    lineNumber: 65,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    "aria-hidden": "true",
                                    className: "w-4 h-4 group-hover:translate-x-1 transition-transform duration-200",
                                    fill: "none",
                                    stroke: "currentColor",
                                    viewBox: "0 0 24 24",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        strokeLinecap: "round",
                                        strokeLinejoin: "round",
                                        strokeWidth: 2,
                                        d: "M9 5l7 7-7 7"
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                                        lineNumber: 67,
                                        columnNumber: 29
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                                    lineNumber: 66,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                            lineNumber: 64,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
                    lineNumber: 38,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
            lineNumber: 22,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/CourseCard.tsx",
        lineNumber: 21,
        columnNumber: 9
    }, this);
}
}),
"[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CoursesPreviewSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$CourseCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/CourseCard.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$icons$2f$index$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/icons/index.tsx [app-rsc] (ecmascript)");
;
;
;
;
function CoursesPreviewSection({ courses }) {
    const gridClass = courses.length === 1 ? "grid-cols-1 max-w-md mx-auto" : courses.length === 2 ? "grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "py-24 relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-divider mb-24"
            }, void 0, false, {
                fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-7xl mx-auto px-6 lg:px-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col md:flex-row justify-between items-start md:items-center mb-16",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-indigo-500 font-medium mb-2",
                                        children: "COURSES"
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                                        lineNumber: 35,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-3xl md:text-4xl font-bold mb-4 text-gray-800",
                                        children: [
                                            "강의는 메인 홈페이지에서 보이되,",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "block gradient-text-purple",
                                                children: "병원 단위 솔루션과는 분리됩니다."
                                            }, void 0, false, {
                                                fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                                                lineNumber: 38,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                                        lineNumber: 36,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-lg text-gray-500 leading-relaxed",
                                        children: "브랜드 전체 경험 안에서 강의는 별도의 B2C 축으로 이어집니다."
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                                        lineNumber: 40,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                                lineNumber: 34,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-4 mt-6 md:mt-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$icons$2f$index$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ClockIcon"], {}, void 0, false, {
                                                fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                                                lineNumber: 44,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs text-orange-700 font-medium",
                                                children: "선착순 마감"
                                            }, void 0, false, {
                                                fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                                                lineNumber: 45,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                                        lineNumber: 43,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/courses",
                                        className: "btn-secondary",
                                        children: "전체 강의 보기"
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                                        lineNumber: 47,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                                lineNumber: 42,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                        lineNumber: 33,
                        columnNumber: 9
                    }, this),
                    courses.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `grid gap-8 ${gridClass}`,
                        children: courses.map((course)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$CourseCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                course: course
                            }, course.id, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                                lineNumber: 56,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                        lineNumber: 54,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "card-premium glow-box text-center py-20",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-gray-500 text-lg",
                                children: "준비 중인 강의가 곧 공개됩니다."
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                                lineNumber: 61,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                href: "/courses",
                                className: "inline-block mt-4 text-indigo-500 font-medium hover:text-indigo-600 transition-colors",
                                children: "강의 페이지 방문하기 →"
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                                lineNumber: 62,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                        lineNumber: 60,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx",
        lineNumber: 30,
        columnNumber: 5
    }, this);
}
}),
"[project]/denjoy-homepage/src/components/TestimonialCards.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TestimonialCards
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$course$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/lib/course-constants.ts [app-rsc] (ecmascript)");
;
;
function TestimonialCards() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid grid-cols-1 md:grid-cols-3 gap-8",
        children: __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$course$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["testimonials"].map((t, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "card-premium glow-box",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-1 mb-4",
                        children: Array.from({
                            length: t.rating
                        }).map((_, j)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                className: "w-5 h-5 text-yellow-400",
                                fill: "currentColor",
                                viewBox: "0 0 20 20",
                                "aria-hidden": "true",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                                }, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/TestimonialCards.tsx",
                                    lineNumber: 11,
                                    columnNumber: 33
                                }, this)
                            }, j, false, {
                                fileName: "[project]/denjoy-homepage/src/components/TestimonialCards.tsx",
                                lineNumber: 10,
                                columnNumber: 29
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/components/TestimonialCards.tsx",
                        lineNumber: 8,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-gray-600 leading-relaxed mb-6",
                        children: [
                            "“",
                            t.content,
                            "”"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/denjoy-homepage/src/components/TestimonialCards.tsx",
                        lineNumber: 15,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "pt-4 border-t border-gray-100",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "font-semibold text-gray-800",
                                children: t.name
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/TestimonialCards.tsx",
                                lineNumber: 19,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-gray-400",
                                children: t.role
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/TestimonialCards.tsx",
                                lineNumber: 20,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/denjoy-homepage/src/components/TestimonialCards.tsx",
                        lineNumber: 18,
                        columnNumber: 21
                    }, this)
                ]
            }, i, true, {
                fileName: "[project]/denjoy-homepage/src/components/TestimonialCards.tsx",
                lineNumber: 7,
                columnNumber: 17
            }, this))
    }, void 0, false, {
        fileName: "[project]/denjoy-homepage/src/components/TestimonialCards.tsx",
        lineNumber: 5,
        columnNumber: 9
    }, this);
}
}),
"[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SocialProofSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$TestimonialCards$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/TestimonialCards.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$icons$2f$index$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/icons/index.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$course$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/lib/course-constants.ts [app-rsc] (ecmascript)");
;
;
;
;
function SocialProofSection() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "py-24 relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-divider mb-24"
            }, void 0, false, {
                fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                lineNumber: 8,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-7xl mx-auto px-6 lg:px-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center mb-16",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "inline-flex items-center gap-3 mb-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex -space-x-2",
                                        "aria-hidden": "true",
                                        children: [
                                            ...Array(5)
                                        ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "w-8 h-8 rounded-full bg-gradient-to-br from-indigo-300 to-indigo-300 border-2 border-white"
                                            }, i, false, {
                                                fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                                                lineNumber: 14,
                                                columnNumber: 17
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                                        lineNumber: 12,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm text-gray-500",
                                        children: [
                                            __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$course$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TOTAL_STUDENTS"],
                                            " 수강"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                                        lineNumber: 17,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                                lineNumber: 11,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-indigo-500 font-medium mb-2",
                                children: "SOCIAL PROOF"
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                                lineNumber: 19,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-3xl md:text-4xl font-bold mb-4 text-gray-800",
                                children: [
                                    "브랜드 신뢰는 결국",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "block gradient-text-purple",
                                        children: "실제 경험에서 나옵니다"
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                                        lineNumber: 22,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                                lineNumber: 20,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg text-gray-500 leading-relaxed",
                                children: "강의와 교육 경험이 브랜드 전체에 대한 신뢰로 이어지도록 홈 섹션도 다시 정렬했습니다."
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                                lineNumber: 24,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-center gap-6 mt-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-1",
                                        "aria-label": `평점 ${__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$course$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["RATING"]}`,
                                        children: [
                                            [
                                                ...Array(5)
                                            ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$icons$2f$index$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StarIcon"], {}, i, false, {
                                                    fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                                                    lineNumber: 30,
                                                    columnNumber: 17
                                                }, this)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-gray-600 font-semibold ml-1",
                                                children: __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$course$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["RATING"]
                                            }, void 0, false, {
                                                fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                                                lineNumber: 32,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                                        lineNumber: 28,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-gray-400",
                                        "aria-hidden": "true",
                                        children: "|"
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                                        lineNumber: 34,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-gray-500 text-sm",
                                        children: [
                                            "만족도 ",
                                            __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$course$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SATISFACTION_RATE"]
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                                        lineNumber: 35,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                                lineNumber: 27,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                        lineNumber: 10,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "card-premium glow-box p-2 sm:p-4",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$TestimonialCards$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                            fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                            lineNumber: 40,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                        lineNumber: 39,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
                lineNumber: 9,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, this);
}
}),
"[project]/denjoy-homepage/src/components/home/FounderSection.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>FounderSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/image.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$icons$2f$index$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/icons/index.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$course$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/lib/course-constants.ts [app-rsc] (ecmascript)");
;
;
;
;
;
const FOUNDER_BADGES = [
    `치과위생사 ${__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$course$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["careerYears"]}년차`,
    `임상교육 ${__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$course$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CLINICAL_EDUCATION_COUNT"]}+회`,
    `수강생 ${__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$course$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TOTAL_STUDENTS"]}`
];
function FounderSection() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "py-24 relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-divider mb-24"
            }, void 0, false, {
                fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                lineNumber: 15,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-4xl mx-auto px-6 lg:px-8",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "card-premium glow-box",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col md:flex-row items-center gap-10",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "shrink-0",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-44 h-44 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-indigo-100",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                        src: "/instructor.png",
                                        alt: "맹준호 대표",
                                        width: 176,
                                        height: 176,
                                        className: "w-full h-full object-cover object-top"
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                                        lineNumber: 21,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                                    lineNumber: 20,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                                lineNumber: 19,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-indigo-500 font-medium mb-2",
                                        children: "FOUNDER"
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                                        lineNumber: 31,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-2xl font-bold text-gray-800 mb-1",
                                        children: "맹준호"
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                                        lineNumber: 32,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-indigo-500 font-medium mb-6",
                                        children: "DenJOY 대표 · 치과위생사 · 임상강사 · 컨설턴트"
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                                        lineNumber: 33,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-wrap gap-3 mb-6",
                                        children: FOUNDER_BADGES.map((badge, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium",
                                                children: badge
                                            }, i, false, {
                                                fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                                                lineNumber: 37,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                                        lineNumber: 35,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-gray-500 leading-relaxed text-sm sm:text-base mb-5",
                                        children: `${__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$course$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["careerYears"]}년간 치과 현장에서 진료실장, 총괄실장, 임상강사, 컨설턴트로 일해왔습니다. 메인 홈페이지에서는 브랜드의 전체 구조를 먼저 설명하고, 실제 솔루션은 각각의 랜딩페이지에서 더 깊게 다루는 방식이 DenJOY에 맞다고 판단했습니다.`
                                    }, void 0, false, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                                        lineNumber: 43,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/about",
                                        className: "inline-flex items-center gap-2 text-indigo-500 font-medium hover:text-indigo-600 transition-colors",
                                        children: [
                                            "더 알아보기",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$icons$2f$index$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ArrowRightSmallIcon"], {
                                                className: "w-4 h-4"
                                            }, void 0, false, {
                                                fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                                                lineNumber: 49,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                                        lineNumber: 47,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                                lineNumber: 30,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                        lineNumber: 18,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                    lineNumber: 17,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/denjoy-homepage/src/components/home/FounderSection.tsx",
        lineNumber: 14,
        columnNumber: 5
    }, this);
}
}),
"[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MicroCommitmentSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$icons$2f$index$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/icons/index.tsx [app-rsc] (ecmascript)");
;
;
;
const MICRO_COMMITS = [
    {
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$icons$2f$index$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MailIcon"], {
            className: "w-6 h-6"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
            lineNumber: 6,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0)),
        title: "문의 먼저",
        description: "메인 홈페이지에서 운영 고민과 도입 방향을 먼저 정리합니다.",
        action: "문의하기",
        href: "/contact"
    },
    {
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$icons$2f$index$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["UsersIcon"], {
            className: "w-6 h-6"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
            lineNumber: 13,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0)),
        title: "커뮤니티 가입",
        description: "동료 치과인들과 운영과 성장 경험을 나눕니다.",
        action: "무료 가입",
        href: "/community"
    },
    {
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$icons$2f$index$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["VideoIcon"], {
            className: "w-6 h-6"
        }, void 0, false, {
            fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
            lineNumber: 20,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0)),
        title: "솔루션 둘러보기",
        description: "브랜드 전체 구조를 본 뒤 개별 랜딩페이지로 이동합니다.",
        action: "바로 보기",
        href: "/solutions"
    }
];
function MicroCommitmentSection() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "py-24 relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-divider mb-24"
            }, void 0, false, {
                fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-5xl mx-auto px-6 lg:px-8 text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-indigo-500 font-medium mb-2",
                        children: "NEXT STEP"
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
                        lineNumber: 33,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-3xl md:text-4xl font-bold mb-4 text-gray-800",
                        children: [
                            "메인 홈페이지는 가볍게 시작하고,",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "block gradient-text-purple",
                                children: "필요한 페이지에서 더 깊게 설명합니다"
                            }, void 0, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
                                lineNumber: 36,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
                        lineNumber: 34,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-lg text-gray-500 mb-10 max-w-3xl mx-auto leading-relaxed",
                        children: "브랜드를 먼저 이해하고, 문의나 커뮤니티, 솔루션 랜딩처럼 다음 행동으로 자연스럽게 이어지도록 구조를 다듬었습니다."
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
                        lineNumber: 38,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-10",
                        children: MICRO_COMMITS.map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                href: item.href,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "card-premium glow-box p-7 group h-full cursor-pointer hover:scale-[1.02] transition-transform duration-300 text-left",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "icon-wrapper mb-4 group-hover:scale-110 transition-transform",
                                            children: item.icon
                                        }, void 0, false, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
                                            lineNumber: 46,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-lg font-bold text-gray-800 mb-1",
                                            children: item.title
                                        }, void 0, false, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
                                            lineNumber: 49,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-gray-500 text-sm mb-4 leading-relaxed",
                                            children: item.description
                                        }, void 0, false, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
                                            lineNumber: 50,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-indigo-500 text-sm font-medium group-hover:text-indigo-600 transition-colors",
                                            children: [
                                                item.action,
                                                " →"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
                                            lineNumber: 51,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
                                    lineNumber: 45,
                                    columnNumber: 15
                                }, this)
                            }, i, false, {
                                fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
                                lineNumber: 44,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
                        lineNumber: 42,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx",
        lineNumber: 30,
        columnNumber: 5
    }, this);
}
}),
"[project]/denjoy-homepage/src/components/home/CTASection.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CTASection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
;
;
function CTASection() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "py-24 relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-divider mb-24"
            }, void 0, false, {
                fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                lineNumber: 6,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-4xl mx-auto px-6 lg:px-8 text-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-900 py-16 px-8 shadow-2xl shadow-indigo-900/40",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "relative flex h-2 w-2",
                                    "aria-hidden": "true",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"
                                        }, void 0, false, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                                            lineNumber: 12,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "relative inline-flex rounded-full h-2 w-2 bg-amber-500"
                                        }, void 0, false, {
                                            fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                                            lineNumber: 13,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                                    lineNumber: 11,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-sm font-bold text-white",
                                    children: "이번 달 신청 마감 임박"
                                }, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                                    lineNumber: 15,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                            lineNumber: 10,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-4xl md:text-5xl font-bold mb-4 text-white",
                            children: [
                                "메인 홈페이지는 브랜드를 설명하고,",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                                    lineNumber: 20,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-amber-300",
                                    children: "솔루션 랜딩은 전환을 맡습니다"
                                }, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                                    lineNumber: 21,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                            lineNumber: 18,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-lg text-indigo-200 mb-3 max-w-2xl mx-auto leading-relaxed",
                            children: "지금은 홈 UX를 먼저 정리했습니다. 다음은 HR, 보험청구, 상담도 같은 방식으로 각자의 랜딩페이지를 세우면 됩니다."
                        }, void 0, false, {
                            fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                            lineNumber: 23,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-indigo-300 mb-10",
                            children: "브랜드 홈페이지와 솔루션 랜딩의 역할을 분리하면 메시지가 훨씬 선명해집니다."
                        }, void 0, false, {
                            fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                            lineNumber: 26,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col sm:flex-row gap-4 justify-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/contact",
                                    className: "px-8 py-4 bg-white text-indigo-700 font-bold rounded-2xl hover:bg-indigo-50 active:scale-95 transition-all shadow-lg flex items-center gap-2 justify-center text-lg",
                                    children: "무료 상담 신청하기"
                                }, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                                    lineNumber: 30,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/solutions",
                                    className: "px-8 py-4 bg-white/10 text-white font-semibold rounded-2xl hover:bg-white/20 active:scale-95 transition-all border border-white/20 flex items-center justify-center text-lg",
                                    children: "솔루션 구조 보기"
                                }, void 0, false, {
                                    fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                                    lineNumber: 36,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                            lineNumber: 29,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                    lineNumber: 8,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
                lineNumber: 7,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/denjoy-homepage/src/components/home/CTASection.tsx",
        lineNumber: 5,
        columnNumber: 5
    }, this);
}
}),
"[project]/denjoy-homepage/src/app/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home,
    "revalidate",
    ()=>revalidate
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$supabase$2d$courses$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/lib/supabase-courses.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$HeroSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/home/HeroSection.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$PainPointsSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/home/PainPointsSection.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$StatsSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/home/StatsSection.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$FourPillarsSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/home/FourPillarsSection.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$SolutionShowcaseSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/home/SolutionShowcaseSection.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$CoursesPreviewSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/home/CoursesPreviewSection.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$SocialProofSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/home/SocialProofSection.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$FounderSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/home/FounderSection.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$MicroCommitmentSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/home/MicroCommitmentSection.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$CTASection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denjoy-homepage/src/components/home/CTASection.tsx [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
const revalidate = 60;
async function Home() {
    const courses = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$lib$2f$supabase$2d$courses$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCourses"])();
    const previewCourses = courses.slice(0, 3);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-mesh overflow-x-hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "orb orb-purple w-[600px] h-[600px] -top-40 -left-40 animate-pulse-glow",
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/denjoy-homepage/src/app/page.tsx",
                lineNumber: 21,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "orb orb-blue w-[500px] h-[500px] top-1/3 -right-40 animate-pulse-glow",
                "aria-hidden": "true",
                style: {
                    animationDelay: '1s'
                }
            }, void 0, false, {
                fileName: "[project]/denjoy-homepage/src/app/page.tsx",
                lineNumber: 22,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative z-10",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$HeroSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/app/page.tsx",
                        lineNumber: 25,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$PainPointsSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/app/page.tsx",
                        lineNumber: 26,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$StatsSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/app/page.tsx",
                        lineNumber: 27,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$FourPillarsSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/app/page.tsx",
                        lineNumber: 28,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$SolutionShowcaseSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/app/page.tsx",
                        lineNumber: 29,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$CoursesPreviewSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                        courses: previewCourses
                    }, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/app/page.tsx",
                        lineNumber: 30,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$SocialProofSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/app/page.tsx",
                        lineNumber: 31,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$FounderSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/app/page.tsx",
                        lineNumber: 32,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$MicroCommitmentSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/app/page.tsx",
                        lineNumber: 33,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$denjoy$2d$homepage$2f$src$2f$components$2f$home$2f$CTASection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/denjoy-homepage/src/app/page.tsx",
                        lineNumber: 34,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/denjoy-homepage/src/app/page.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/denjoy-homepage/src/app/page.tsx",
        lineNumber: 20,
        columnNumber: 5
    }, this);
}
}),
"[project]/denjoy-homepage/src/app/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/denjoy-homepage/src/app/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__78956859._.js.map