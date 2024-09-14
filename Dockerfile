# Use Python 3.12.4 as the base image
FROM python:3.12.4-slim AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies and build tools
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install pip requirements
COPY server/requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# Use a new stage for the final image
FROM python:3.12.4-slim

# Create a non-root user
RUN useradd --create-home appuser

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV HOME=/home/appuser
ENV APP_HOME=/home/appuser/app
ENV PORT=8000

# Create and set working directory
WORKDIR $APP_HOME

# Install system dependencies and build tools
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy wheels from builder and install
COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements.txt .
RUN pip install --no-cache /wheels/*

# Copy the backend application
COPY server/*.py $APP_HOME/

# Copy the React build files
COPY client/build $APP_HOME/client/build

# Change ownership of the app files
RUN chown -R appuser:appuser $APP_HOME

# Switch to non-root user
USER appuser

# Expose the port the app runs on
EXPOSE $PORT

# Run gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000",  "--timeout", "120", "--log-level", "debug","main:app"]