FROM alpine:latest

RUN apk add --no-cache ca-certificates tzdata iptables wget

VOLUME ["/root/.config/mihomo/"]

COPY --from=metacubex/mihomo /mihomo /mihomo
ADD mihomo-keeper.sh /mihomo-keeper.sh
RUN chmod +x /mihomo-keeper.sh
ENTRYPOINT [ "/mihomo-keeper.sh" ]
