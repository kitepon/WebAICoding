# syntax=docker/dockerfile:1.7

# ブログを kitepon.dev/blog/ の静的配信物として焼く。
# baseURL は hugo.toml を正本とする。
# hugo_extended は glibc ビルドで musl では動かない（C++ シンボルの relocation で落ちる）。
# CI と同じ extended バイナリを使うため builder は glibc 系にする。
# 最終 image は nginx:alpine のままなので、配信物のサイズには影響しない。
FROM debian:bookworm-slim AS builder

ARG HUGO_VERSION=0.164.0
ARG KITEPON_RELEASE=unknown
ENV HUGO_PARAMS_RELEASE=${KITEPON_RELEASE}

# 実行中の arch から解決する。buildx の TARGETARCH に依存しないので、
# BuildKit の無い環境でも同じ Dockerfile がそのまま通る。
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && case "$(uname -m)" in \
         x86_64) HUGO_ARCH=linux-amd64 ;; \
         aarch64|arm64) HUGO_ARCH=linux-arm64 ;; \
         *) echo "未対応の arch: $(uname -m)" >&2; exit 1 ;; \
       esac \
    && curl -fsSL -o /tmp/hugo.tar.gz \
      "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_${HUGO_ARCH}.tar.gz" \
    && tar -xzf /tmp/hugo.tar.gz -C /usr/local/bin hugo \
    && hugo version

WORKDIR /src
COPY . .

# 生成物は /blog 配下へ出す。nginx の root と Caddy が渡す path を一致させる。
RUN hugo --minify --destination /out/blog

FROM nginx:1.29-alpine

# SEC-021: emSign ECC Root CA G3 の信頼を除いた ca-certificates（20261020-r0 以上）へ上げる。
# 基底imageの更新を待たずに上げ、版が足りない時やG3が残る時はbuildを止める。
RUN apk upgrade --no-cache ca-certificates ca-certificates-bundle \
    && bundle="$(apk info -v ca-certificates-bundle | sed -n 's/^ca-certificates-bundle-//p')" \
    && [ "$(apk version -t "$bundle" 20261020-r0)" != "<" ] \
    && [ ! -e /usr/share/ca-certificates/mozilla/emSign_ECC_Root_CA_-_G3.crt ]

COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /out /usr/share/nginx/html

RUN mkdir -p \
      /tmp/client_temp \
      /tmp/proxy_temp \
      /tmp/fastcgi_temp \
      /tmp/uwsgi_temp \
      /tmp/scgi_temp \
    && chown -R nginx:nginx \
      /tmp/client_temp \
      /tmp/proxy_temp \
      /tmp/fastcgi_temp \
      /tmp/uwsgi_temp \
      /tmp/scgi_temp \
      /usr/share/nginx/html

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT []
CMD ["nginx", "-g", "daemon off;"]
