@echo off
call .venv\Scripts\activate

call pip install -r requirements.txt

call python run.py


