FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Optional heavyweight model dependency for GPU builds.
ARG INSTALL_TRIBEV2=false
RUN if [ "$INSTALL_TRIBEV2" = "true" ]; then \
    pip install --no-cache-dir git+https://github.com/facebookresearch/tribev2.git ; \
    fi

COPY . .

EXPOSE 7860

CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "7860"]
