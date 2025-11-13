import tkinter as tk
from tkinter import ttk, messagebox
import json
import pyperclip
import os
from pathlib import Path

class ToolTip:
    """툴팁 클래스"""
    def __init__(self, widget):
        self.widget = widget
        self.tip_window = None

    def show_tip(self, text):
        """툴팁 표시"""
        if self.tip_window:
            return

        # 버튼 위치 계산
        x = self.widget.winfo_rootx() + self.widget.winfo_width() // 2
        y = self.widget.winfo_rooty() - 40

        # 툴팁 윈도우 생성
        self.tip_window = tw = tk.Toplevel(self.widget)
        tw.wm_overrideredirect(True)
        tw.wm_geometry(f"+{x}+{y}")

        # 툴팁 레이블
        label = tk.Label(
            tw,
            text=text,
            background="#27ae60",
            foreground="white",
            relief='solid',
            borderwidth=1,
            font=('Arial', 10, 'bold'),
            padx=15,
            pady=8
        )
        label.pack()

        # 2초 후 자동 제거
        self.widget.after(2000, self.hide_tip)

    def hide_tip(self):
        """툴팁 숨기기"""
        if self.tip_window:
            self.tip_window.destroy()
            self.tip_window = None

class DeploymentHelperV2:
    def __init__(self, root):
        self.root = root
        self.root.title("🚀 Deployment Helper v2 - 환경변수 지원")
        self.root.geometry("1400x900")
        self.root.configure(bg='#f0f0f0')

        # 창 크기 조절 가능하게 설정
        self.root.resizable(True, True)

        # 최소 크기 설정
        self.root.minsize(1000, 600)

        # 툴팁 저장용 딕셔너리
        self.tooltips = {}

        # 환경변수 저장
        self.env_vars = {}

        # .env 파일 로드
        self.load_env_file()

        # JSON 파일 로드
        self.load_commands()

        # UI 생성
        self.create_ui()

    def load_env_file(self):
        """env 파일에서 환경변수 로드"""
        env_path = os.path.join(os.path.dirname(__file__), '.env')

        if not os.path.exists(env_path):
            messagebox.showwarning(
                "환경변수 파일 없음",
                ".env 파일이 없습니다.\n.env.example 파일을 복사하여 .env 파일을 생성하세요.\n\n기본값으로 진행합니다."
            )
            # 기본값 설정
            self.env_vars = {
                'VM_INSTANCE_NAME': 'instance-20251020-140632',
                'VM_ZONE': 'asia-northeast3-a',
                'VM_USER': 'haeryongdoryong',
                'VM_EXTERNAL_IP': '34.158.217.123',
                'GCP_PROJECT_ID': 'YOUR_PROJECT_ID',
                'LOCAL_PROJECT_PATH': r'd:\Coding\gangubuy-restaurant',
                'VM_PROJECT_PATH': '/opt/gangubuy-restaurant',
                'POSTGRES_USER': 'gangubuy-restaurant_user',
                'POSTGRES_DB': 'gangubuy-restaurant_db'
            }
            return

        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    # 주석과 빈 줄 무시
                    if not line or line.startswith('#'):
                        continue
                    # KEY=VALUE 파싱
                    if '=' in line:
                        key, value = line.split('=', 1)
                        self.env_vars[key.strip()] = value.strip()
        except Exception as e:
            messagebox.showerror("Error", f".env 파일 로드 실패: {e}")
            self.env_vars = {}

    def replace_env_vars(self, text):
        """텍스트 내의 환경변수를 실제 값으로 치환"""
        result = text
        for key, value in self.env_vars.items():
            # ${VAR} 형식 치환
            result = result.replace(f"${{{key}}}", value)
            # $VAR 형식 치환 (PowerShell)
            result = result.replace(f"${key}", value)
        return result

    def load_commands(self):
        """JSON 파일에서 명령어 로드"""
        json_path = os.path.join(os.path.dirname(__file__), 'commands.json')
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.categories = data['categories']
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load commands.json: {e}")
            self.categories = []

    def create_ui(self):
        """UI 생성"""
        # 타이틀
        title_frame = tk.Frame(self.root, bg='#2c3e50', height=60)
        title_frame.pack(fill='x', pady=(0, 10))
        title_frame.pack_propagate(False)

        title_label = tk.Label(
            title_frame,
            text="🚀 Deployment Command Helper v2 (환경변수 지원)",
            font=('Arial', 18, 'bold'),
            bg='#2c3e50',
            fg='white'
        )
        title_label.pack(pady=15)

        # 탭 생성
        style = ttk.Style()
        style.configure('TNotebook', tabposition='wn')  # 왼쪽 세로 탭

        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill='both', expand=True, padx=10, pady=5)

        # 각 카테고리별 탭 추가
        for idx, category in enumerate(self.categories):
            self.create_category_tab(category)
            # "로컬 → VM 파일 전송" 다음에 파일 전송 탭 추가
            if "로컬 → VM 파일 전송" in category['name']:
                self.create_file_transfer_tab()

        # 하단 정보
        info_frame = tk.Frame(self.root, bg='#ecf0f1', height=40)
        info_frame.pack(fill='x', side='bottom')
        info_frame.pack_propagate(False)

        info_label = tk.Label(
            info_frame,
            text="💡 버튼을 클릭하면 명령어가 클립보드에 복사됩니다 (환경변수 자동 치환됨)",
            font=('Arial', 9),
            bg='#ecf0f1',
            fg='#7f8c8d'
        )
        info_label.pack(pady=10)

    def bind_mousewheel_to_widget(self, widget, canvas, handler):
        """위젯과 모든 자식 위젯에 마우스 휠 이벤트 바인딩"""
        widget.bind("<MouseWheel>", handler)
        widget.bind("<Button-4>", lambda e: canvas.yview_scroll(-1, "units"))
        widget.bind("<Button-5>", lambda e: canvas.yview_scroll(1, "units"))

        # 자식 위젯에도 재귀적으로 바인딩
        for child in widget.winfo_children():
            self.bind_mousewheel_to_widget(child, canvas, handler)

    def create_category_tab(self, category):
        """각 카테고리 탭 생성"""
        # 프레임 생성
        tab_frame = ttk.Frame(self.notebook)
        self.notebook.add(tab_frame, text=category['name'])

        # 스크롤 가능한 캔버스
        canvas = tk.Canvas(tab_frame, bg='white')
        scrollbar = ttk.Scrollbar(tab_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        # 마우스 휠 스크롤 이벤트 추가
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")

        # 캔버스에 마우스 휠 스크롤 바인딩
        canvas.bind("<MouseWheel>", _on_mousewheel)
        canvas.bind("<Button-4>", lambda e: canvas.yview_scroll(-1, "units"))
        canvas.bind("<Button-5>", lambda e: canvas.yview_scroll(1, "units"))

        # scrollable_frame에도 마우스 휠 스크롤 바인딩
        scrollable_frame.bind("<MouseWheel>", _on_mousewheel)
        scrollable_frame.bind("<Button-4>", lambda e: canvas.yview_scroll(-1, "units"))
        scrollable_frame.bind("<Button-5>", lambda e: canvas.yview_scroll(1, "units"))

        # 명령어 버튼들 추가
        for idx, cmd in enumerate(category['commands']):
            self.create_command_button(scrollable_frame, cmd, idx, canvas, _on_mousewheel)

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

    def create_command_button(self, parent, command, index, canvas, mousewheel_handler):
        """명령어 버튼 생성"""
        # 환경변수 치환
        replaced_command = self.replace_env_vars(command['command'])

        # 컨테이너 프레임
        cmd_frame = tk.Frame(
            parent,
            bg='white',
            relief='solid',
            borderwidth=1,
            padx=15,
            pady=10
        )
        cmd_frame.pack(fill='x', padx=10, pady=8)

        # 명령어 이름 (헤더)
        name_label = tk.Label(
            cmd_frame,
            text=f"📌 {command['name']} - {command['description']}",
            font=('Arial', 11, 'bold'),
            bg='white',
            fg='#2c3e50',
            anchor='w'
        )
        name_label.pack(fill='x', pady=(0, 8))

        # 명령어 버튼 (환경변수 치환된 명령어가 버튼 텍스트)
        cmd_btn = tk.Button(
            cmd_frame,
            text=replaced_command,
            command=lambda btn=None, cmd=replaced_command, nm=command['name']: self.copy_to_clipboard(btn or cmd_btn, cmd, nm),
            bg='#ecf0f1',
            fg='#1a1a1a',
            font=('Consolas', 11, 'bold'),
            relief='flat',
            cursor='hand2',
            padx=15,
            pady=12,
            anchor='w',
            justify='left',
            wraplength=1300  # 긴 명령어 자동 줄바꿈
        )
        cmd_btn.pack(fill='x')

        # 툴팁 생성
        self.tooltips[id(cmd_btn)] = ToolTip(cmd_btn)

        # 호버 효과
        cmd_btn.bind('<Enter>', lambda e: cmd_btn.config(bg='#3498db', fg='white'))
        cmd_btn.bind('<Leave>', lambda e: cmd_btn.config(bg='#ecf0f1', fg='#1a1a1a'))

        # 모든 위젯에 마우스 휠 이벤트 바인딩
        self.bind_mousewheel_to_widget(cmd_frame, canvas, mousewheel_handler)

    def copy_to_clipboard(self, button, command, name):
        """클립보드에 복사"""
        try:
            pyperclip.copy(command)
            # 툴팁 표시
            tooltip = self.tooltips.get(id(button))
            if tooltip:
                tooltip.show_tip(f"✅ 복사 완료!")
        except Exception as e:
            messagebox.showerror("Error", f"복사 실패: {e}")

    def create_file_transfer_tab(self):
        """파일 전송 탭 생성"""
        tab_frame = ttk.Frame(self.notebook)
        self.notebook.add(tab_frame, text="📁 파일 전송")

        # 메인 컨테이너 (왼쪽: 파일 트리, 오른쪽: 명령어 생성)
        main_paned = ttk.PanedWindow(tab_frame, orient=tk.HORIZONTAL)
        main_paned.pack(fill='both', expand=True, padx=10, pady=10)

        # 왼쪽 프레임 - 파일 트리
        left_frame = ttk.Frame(main_paned)
        main_paned.add(left_frame, weight=1)

        # 트리 헤더
        tree_header = tk.Label(
            left_frame,
            text="📂 로컬 프로젝트 파일",
            font=('Arial', 12, 'bold'),
            bg='#3498db',
            fg='white',
            padx=10,
            pady=8
        )
        tree_header.pack(fill='x')

        # 스크롤바와 트리뷰
        tree_scroll = ttk.Scrollbar(left_frame)
        tree_scroll.pack(side='right', fill='y')

        self.file_tree = ttk.Treeview(
            left_frame,
            yscrollcommand=tree_scroll.set,
            selectmode='none',
            height=25
        )
        self.file_tree.pack(fill='both', expand=True)
        tree_scroll.config(command=self.file_tree.yview)

        # 체크박스 상태 저장
        self.check_states = {}

        # 트리에 체크박스 아이콘 설정
        self.file_tree.heading('#0', text='파일 경로 (클릭하여 선택/해제)', anchor='w')

        # 프로젝트 루트 경로 (환경변수에서 가져오기)
        local_path = self.env_vars.get('LOCAL_PROJECT_PATH', r"d:\Coding\gangubuy-restaurant")
        self.project_root = Path(local_path)

        # 제외할 폴더/파일
        self.exclude_patterns = {
            'node_modules', '.git', '__pycache__', '.vscode',
            'dist', 'build', '.env', '.env.local', 'uploads',
            'qr-codes', '.DS_Store'
        }

        # 파일 트리 생성
        self.populate_file_tree()

        # 트리 아이템 클릭 이벤트
        self.file_tree.bind('<Button-1>', self.toggle_check)

        # 오른쪽 프레임 - 명령어 생성
        right_frame = ttk.Frame(main_paned)
        main_paned.add(right_frame, weight=1)

        # 명령어 생성 헤더
        cmd_header = tk.Label(
            right_frame,
            text="🚀 생성된 명령어",
            font=('Arial', 12, 'bold'),
            bg='#2ecc71',
            fg='white',
            padx=10,
            pady=8
        )
        cmd_header.pack(fill='x')

        # VM 설정 프레임 (환경변수에서 기본값 가져오기)
        config_frame = tk.Frame(right_frame, bg='white', padx=10, pady=10)
        config_frame.pack(fill='x', padx=5, pady=5)

        tk.Label(
            config_frame,
            text="VM 사용자명:",
            font=('Arial', 10, 'bold'),
            bg='white'
        ).grid(row=0, column=0, sticky='w', pady=5)

        self.username_var = tk.StringVar(value=self.env_vars.get('VM_USER', 'haeryongdoryong'))
        tk.Entry(
            config_frame,
            textvariable=self.username_var,
            font=('Consolas', 10),
            width=30
        ).grid(row=0, column=1, sticky='w', padx=10, pady=5)

        tk.Label(
            config_frame,
            text="VM Instance:",
            font=('Arial', 10, 'bold'),
            bg='white'
        ).grid(row=1, column=0, sticky='w', pady=5)

        self.instance_var = tk.StringVar(value=self.env_vars.get('VM_INSTANCE_NAME', 'instance-20251020-140632'))
        tk.Entry(
            config_frame,
            textvariable=self.instance_var,
            font=('Consolas', 10),
            width=30
        ).grid(row=1, column=1, sticky='w', padx=10, pady=5)

        tk.Label(
            config_frame,
            text="Zone:",
            font=('Arial', 10, 'bold'),
            bg='white'
        ).grid(row=2, column=0, sticky='w', pady=5)

        self.zone_var = tk.StringVar(value=self.env_vars.get('VM_ZONE', 'asia-northeast3-a'))
        tk.Entry(
            config_frame,
            textvariable=self.zone_var,
            font=('Consolas', 10),
            width=30
        ).grid(row=2, column=1, sticky='w', padx=10, pady=5)

        tk.Label(
            config_frame,
            text="VM 대상 경로:",
            font=('Arial', 10, 'bold'),
            bg='white'
        ).grid(row=3, column=0, sticky='w', pady=5)

        self.vm_path_var = tk.StringVar(value=self.env_vars.get('VM_PROJECT_PATH', '/opt/gangubuy-restaurant'))
        tk.Entry(
            config_frame,
            textvariable=self.vm_path_var,
            font=('Consolas', 10),
            width=30
        ).grid(row=3, column=1, sticky='w', padx=10, pady=5)

        # 명령어 생성 버튼
        generate_btn = tk.Button(
            right_frame,
            text="🔄 명령어 생성",
            command=self.generate_commands,
            bg='#3498db',
            fg='white',
            font=('Arial', 11, 'bold'),
            padx=20,
            pady=10,
            cursor='hand2'
        )
        generate_btn.pack(pady=10)

        # 명령어 표시 영역 (스크롤 가능)
        cmd_scroll_frame = tk.Frame(right_frame)
        cmd_scroll_frame.pack(fill='both', expand=True, padx=5)

        cmd_scrollbar = ttk.Scrollbar(cmd_scroll_frame)
        cmd_scrollbar.pack(side='right', fill='y')

        self.commands_canvas = tk.Canvas(
            cmd_scroll_frame,
            bg='white',
            yscrollcommand=cmd_scrollbar.set
        )
        self.commands_canvas.pack(side='left', fill='both', expand=True)
        cmd_scrollbar.config(command=self.commands_canvas.yview)

        self.commands_frame = tk.Frame(self.commands_canvas, bg='white')
        self.commands_canvas.create_window((0, 0), window=self.commands_frame, anchor='nw')

        self.commands_frame.bind(
            '<Configure>',
            lambda e: self.commands_canvas.configure(scrollregion=self.commands_canvas.bbox('all'))
        )

    def populate_file_tree(self, parent='', path=None):
        """파일 트리 채우기"""
        if path is None:
            path = self.project_root

        try:
            items = sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))

            for item in items:
                # 제외 패턴 확인
                if item.name in self.exclude_patterns:
                    continue

                # 상대 경로 계산
                rel_path = item.relative_to(self.project_root)
                item_id = str(rel_path)

                # 아이콘 선택
                if item.is_dir():
                    display_text = f"📁 {item.name}"
                else:
                    display_text = f"📄 {item.name}"

                # 트리에 추가
                node = self.file_tree.insert(
                    parent,
                    'end',
                    item_id,
                    text=display_text,
                    values=(str(item),),
                    tags=('unchecked',)
                )

                # 체크 상태 초기화
                self.check_states[item_id] = False

                # 디렉토리면 재귀적으로 하위 항목 추가
                if item.is_dir():
                    self.populate_file_tree(node, item)

        except PermissionError:
            pass

    def toggle_check(self, event):
        """체크박스 토글"""
        region = self.file_tree.identify('region', event.x, event.y)
        if region != 'tree':
            return

        item = self.file_tree.identify_row(event.y)
        if not item:
            return

        # 현재 상태 토글
        current_state = self.check_states.get(item, False)
        new_state = not current_state
        self.check_states[item] = new_state

        # 아이콘 업데이트
        text = self.file_tree.item(item, 'text')
        if new_state:
            # 체크됨
            if text.startswith('📁'):
                new_text = '✅ ' + text[2:]
            elif text.startswith('📄'):
                new_text = '✅ ' + text[2:]
            else:
                new_text = '✅ ' + text.replace('✅ ', '')
            self.file_tree.item(item, text=new_text, tags=('checked',))
        else:
            # 체크 해제
            if text.startswith('✅'):
                text = text[2:].strip()
            if '📁' not in text and '📄' not in text:
                # 아이콘 복구
                path = Path(self.file_tree.item(item, 'values')[0])
                if path.is_dir():
                    new_text = f"📁 {text}"
                else:
                    new_text = f"📄 {text}"
            else:
                new_text = text
            self.file_tree.item(item, text=new_text, tags=('unchecked',))

    def generate_commands(self):
        """선택된 파일들의 명령어 생성"""
        # 기존 명령어 버튼 제거
        for widget in self.commands_frame.winfo_children():
            widget.destroy()

        # 선택된 파일들 수집
        selected_files = []
        for item_id, checked in self.check_states.items():
            if checked:
                file_path = Path(self.file_tree.item(item_id, 'values')[0])
                if file_path.is_file():  # 파일만 (디렉토리 제외)
                    selected_files.append(file_path)

        if not selected_files:
            tk.Label(
                self.commands_frame,
                text="⚠️ 파일을 선택해주세요",
                font=('Arial', 11),
                bg='white',
                fg='#e74c3c'
            ).pack(pady=20)
            return

        # VM 설정 가져오기
        username = self.username_var.get()
        instance = self.instance_var.get()
        zone = self.zone_var.get()
        vm_base_path = self.vm_path_var.get()

        # 각 파일별 명령어 생성
        for idx, file_path in enumerate(selected_files):
            rel_path = file_path.relative_to(self.project_root)

            # VM 대상 경로 계산 (POSIX 형식)
            vm_target = f"{vm_base_path}/{rel_path.as_posix()}"

            # Windows 경로를 슬래시로 변경하고 따옴표로 감싸기
            local_path_str = str(file_path).replace('\\', '/')

            # gcloud scp 명령어 생성 (사용자명 포함)
            command = f'gcloud compute scp "{local_path_str}" {username}@{instance}:{vm_target} --zone={zone}'

            # 명령어 버튼 프레임
            cmd_btn_frame = tk.Frame(
                self.commands_frame,
                bg='white',
                relief='solid',
                borderwidth=1,
                padx=10,
                pady=8
            )
            cmd_btn_frame.pack(fill='x', padx=5, pady=5)

            # 파일명 레이블
            tk.Label(
                cmd_btn_frame,
                text=f"📄 {rel_path}",
                font=('Arial', 10, 'bold'),
                bg='white',
                fg='#2c3e50',
                anchor='w'
            ).pack(fill='x', pady=(0, 5))

            # 명령어 버튼
            cmd_btn = tk.Button(
                cmd_btn_frame,
                text=command,
                command=lambda cmd=command, btn=None: self.copy_command(btn or cmd_btn, cmd),
                bg='#ecf0f1',
                fg='#1a1a1a',
                font=('Consolas', 9),
                relief='flat',
                cursor='hand2',
                padx=10,
                pady=8,
                anchor='w',
                justify='left',
                wraplength=600
            )
            cmd_btn.pack(fill='x')

            # 툴팁 추가
            self.tooltips[id(cmd_btn)] = ToolTip(cmd_btn)

            # 호버 효과
            cmd_btn.bind('<Enter>', lambda e, b=cmd_btn: b.config(bg='#27ae60', fg='white'))
            cmd_btn.bind('<Leave>', lambda e, b=cmd_btn: b.config(bg='#ecf0f1', fg='#1a1a1a'))

    def copy_command(self, button, command):
        """명령어 클립보드 복사"""
        try:
            pyperclip.copy(command)
            tooltip = self.tooltips.get(id(button))
            if tooltip:
                tooltip.show_tip("✅ 복사 완료!")
        except Exception as e:
            messagebox.showerror("Error", f"복사 실패: {e}")

def main():
    root = tk.Tk()
    app = DeploymentHelperV2(root)
    root.mainloop()

if __name__ == "__main__":
    main()
