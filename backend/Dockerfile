FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    SENTIENT_ENV=development \
    SENTIENT_MODEL_DIR=/srv/assets/models

WORKDIR /srv/sentient

COPY backend/requirements.txt ./requirements.txt
RUN python -m pip install --no-cache-dir --disable-pip-version-check -r requirements.txt

COPY backend/app ./app
COPY assets/models /srv/assets/models

RUN addgroup --system sentient \
    && adduser --system --ingroup sentient --home /srv/sentient sentient \
    && chown -R sentient:sentient /srv/sentient /srv/assets

USER sentient

EXPOSE 8000

HEALTHCHECK --interval=5s --timeout=3s --retries=12 --start-period=5s \
  CMD python -c "import json,urllib.request; data=json.load(urllib.request.urlopen('http://127.0.0.1:8000/health',timeout=2)); raise SystemExit(0 if data.get('model_available') else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
