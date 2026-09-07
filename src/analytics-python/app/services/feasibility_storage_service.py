import json
from urllib.error import (
    HTTPError,
    URLError,
)
from urllib.parse import quote
from urllib.request import Request, urlopen

from fastapi import HTTPException

from app.core.config import get_settings


class FeasibilityStorageService:
    def __init__(self) -> None:
        settings = get_settings()

        self.supabase_url = (
            settings.supabase_url.rstrip("/")
        )

        self.service_role_key = (
            settings.supabase_service_role_key
        )

        self.bucket = (
            settings.feasibility_storage_bucket
        )

    def upload(
        self,
        storage_path: str,
        content: bytes,
        mime_type: str,
    ) -> None:
        encoded_bucket = quote(
            self.bucket,
            safe="",
        )

        encoded_path = quote(
            storage_path,
            safe="/",
        )

        url = (
            f"{self.supabase_url}"
            f"/storage/v1/object/"
            f"{encoded_bucket}/"
            f"{encoded_path}"
        )

        request = Request(
            url=url,
            data=content,
            method="POST",
            headers={
                "Authorization": (
                    f"Bearer "
                    f"{self.service_role_key}"
                ),
                "apikey": (
                    self.service_role_key
                ),
                "Content-Type": mime_type,
                "x-upsert": "false",
            },
        )

        try:
            with urlopen(
                request,
                timeout=30,
            ) as response:
                if not (
                    200
                    <= response.status
                    < 300
                ):
                    raise HTTPException(
                        status_code=502,
                        detail=(
                            "Unable to upload "
                            "project document."
                        ),
                    )

        except HTTPError as exc:
            detail = self._read_error(
                exc
            )

            raise HTTPException(
                status_code=502,
                detail=(
                    "Unable to upload "
                    f"project document: {detail}"
                ),
            ) from exc

        except URLError as exc:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Unable to reach "
                    "project file storage."
                ),
            ) from exc

    def remove(
        self,
        storage_paths: list[str],
    ) -> None:
        if not storage_paths:
            return

        encoded_bucket = quote(
            self.bucket,
            safe="",
        )

        url = (
            f"{self.supabase_url}"
            f"/storage/v1/object/"
            f"{encoded_bucket}"
        )

        body = json.dumps(
            {
                "prefixes": storage_paths,
            }
        ).encode("utf-8")

        request = Request(
            url=url,
            data=body,
            method="DELETE",
            headers={
                "Authorization": (
                    f"Bearer "
                    f"{self.service_role_key}"
                ),
                "apikey": (
                    self.service_role_key
                ),
                "Content-Type": (
                    "application/json"
                ),
            },
        )

        try:
            with urlopen(
                request,
                timeout=30,
            ):
                pass

        except (
            HTTPError,
            URLError,
        ):
            # Cleanup failure must not mask the original
            # submission/upload error.
            pass

    @staticmethod
    def _read_error(
        exc: HTTPError,
    ) -> str:
        try:
            raw = exc.read().decode(
                "utf-8"
            )

            payload = json.loads(
                raw
            )

            return (
                payload.get("message")
                or payload.get("error")
                or f"Storage error {exc.code}"
            )

        except Exception:
            return (
                f"Storage error {exc.code}"
            )