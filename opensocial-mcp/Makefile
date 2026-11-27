.PHONY: install dev test lint typecheck security dashboard check demo serve clean

install:            ## Install the package and dev tools into .venv
	python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"

test:               ## Run the full test suite with coverage
	.venv/bin/pytest --cov --cov-report=term-missing

lint:
	.venv/bin/ruff check src tests scripts && .venv/bin/ruff format --check src tests scripts

typecheck:
	.venv/bin/mypy

security:           ## Static security scan, dependency audit and secret scan
	.venv/bin/bandit -q -r src -ll
	.venv/bin/pip-audit --skip-editable
	.venv/bin/python scripts/security_check.py

dashboard:
	cd dashboard && npm ci && npm run build

check: lint typecheck test security   ## Everything CI runs
	.venv/bin/python scripts/release_check.py

demo:               ## Start a fully simulated demo (no real accounts)
	.venv/bin/python scripts/setup.py --demo

serve:
	.venv/bin/opensocial serve

clean:
	rm -rf .pytest_cache .mypy_cache .ruff_cache .coverage dashboard/dist
