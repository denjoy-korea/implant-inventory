# Dentweb 임플란트 통계 자동화

다음 작업을 자동 실행합니다.

1. 덴트웹에서 `경영통계 > 임플란트 수술 통계` 화면 진입
2. `특정기간`을 오늘 날짜(예: `2026-03-05`)로 지정
3. 조회 결과가 없으면 엑셀 저장/업로드 없이 종료
4. 조회 결과가 있으면 엑셀 저장 후 SaaS 업로드

운영 모드는 2가지입니다.

- 로컬 스케줄러 모드: Windows 작업 스케줄러에서 `run_automation.py` 직접 실행
- 앱 연동 에이전트 모드: `run_agent.py`가 앱 서버 설정(간격/수동실행요청)을 폴링

## 1) 설치

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## 2) 설정

```bash
cp config.example.yaml config.yaml
```

`config.yaml`에서 아래 항목을 반드시 수정하세요.

- `upload.url`: SaaS 업로드 API 주소
- `upload.token_env`: API 토큰을 읽을 환경변수 이름 (에이전트 모드에서는 로그인 JWT가 자동 주입됨)
- `upload.form_fields.hospital_id`: 상위 앱의 병원 UUID (`DENTWEB_UPLOAD_TOKEN_MAP` 사용 시 생략 가능)
- `paths.output_dir`: 덴트웹 엑셀 저장 폴더
- `selectors.*`: 실제 덴트웹 UI에 맞게 셀렉터 또는 좌표 보정

토큰 환경변수 예시:

```bash
export DENTWEB_UPLOAD_TOKEN="YOUR_TOKEN"
```

Windows PowerShell:

```powershell
setx DENTWEB_UPLOAD_TOKEN "YOUR_TOKEN"
```

상위 `implant-inventory` 프로젝트의 Edge Function(`dentweb-upload`)을 쓰는 경우:

- `upload.url`: `https://<project-ref>.supabase.co/functions/v1/dentweb-upload`
- `upload.file_field_name`: `file`
- `upload.form_fields.hospital_id`: `{병원 UUID}` (토큰 매핑 모드면 생략 가능)

## 3) 셀렉터/좌표 보정

1. 우선 `selectors.*.candidates`(UIA 기반)로 시도
2. 실패 시 `selectors.*.coords` 좌표를 입력
3. 좌표 측정:

```bash
python tools/capture_mouse_pos.py
```

## 4) 단건 테스트 실행

```bash
python run_automation.py --config config.yaml --reason manual
```

드라이런(클릭/업로드 없음):

```bash
python run_automation.py --config config.yaml --dry-run
```

## 4-1) 앱 연동 에이전트 실행 (권장)

앱 서비스에서 시간 간격 자동 실행 + "지금 실행" 버튼을 쓰려면 에이전트 모드를 사용하세요.

필수 환경변수:

```bash
export DENTWEB_AGENT_EMAIL="member@example.com"
export DENTWEB_AGENT_PASSWORD="your-password"
export VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
export VITE_SUPABASE_ANON_KEY="..."
```

선택 환경변수:

```bash
export DENTWEB_AUTOMATION_URL="https://<project-ref>.supabase.co/functions/v1/dentweb-automation"
```

실행:

```bash
python run_agent.py --config config.yaml --poll-sec 60
```

에이전트가 서버에 주기적으로 질의하여:

- 간격 도달 시 자동 실행
- 앱의 "지금 실행 요청" 클릭 시 즉시 실행
- 실행 결과(success/no_data/failed)를 서버에 보고

## 5) 자동 실행 등록 (Windows 작업 스케줄러)

관리자 PowerShell에서:

```powershell
cd C:\path\to\dentweb-auto
.\install_task.ps1 -PythonExe "C:\path\to\python.exe" -ProjectDir "C:\path\to\dentweb-auto"
```

등록되는 작업:

- `Dentweb-Implant-Upload-2200`: 매일 22:00 실행
- `Dentweb-Implant-Upload-Startup`: 로그인/시작 시 실행

`Startup` 작업은 `startup_guard_hour`(기본 22) 이전에는 종료합니다.

## 6) 로그/상태 파일

- 로그: `logs/run_YYYYMMDD.log`
- 상태: `state/run_state.json`

상태값:

- `success`: 완료
- `no_data`: 조회 결과 없음(정상 종료)
- `failed`: 실패

같은 날짜에 `success` 또는 `no_data`가 기록되면 중복 실행을 방지합니다.

## 문제 해결 체크포인트

- 덴트웹 해상도/배율(권장 100%)이 바뀌면 좌표 자동화가 깨질 수 있습니다.
- UIA 셀렉터가 잡히지 않으면 `Inspect.exe`로 컨트롤 속성을 확인해 `candidates`를 보정하세요.
- 엑셀 저장 시 "다른 이름으로 저장" 대화상자가 뜨면 자동으로 Enter를 눌러 기본 저장을 시도합니다.
