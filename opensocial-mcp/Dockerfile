# syntax=docker/dockerfile:1.7
# ---- dashboard build --------------------------------------------------------
FROM node:22.12-alpine AS dashboard
WORKDIR /dashboard
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY dashboard/ ./
RUN npm run build

# ---- python runtime ---------------------------------------------------------
FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    OPENSOCIAL_ENVIRONMENT=production OPENSOCIAL_MEDIA_ROOTS=/data/media
RUN useradd --create-home --uid 10001 opensocial
WORKDIR /app
COPY pyproject.toml README.md LICENSE ./
COPY src ./src
RUN pip install ".[postgres]"
COPY --from=dashboard /dashboard/dist ./dashboard/dist
RUN mkdir -p /data/media && chown -R opensocial:opensocial /data
USER opensocial
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/api/health').status==200 else 1)"
CMD ["opensocial", "serve", "--host", "0.0.0.0", "--port", "8080"]
