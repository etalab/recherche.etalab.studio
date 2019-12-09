#!/usr/bin/env python3

import json
from dataclasses import dataclass
from time import perf_counter
from typing import List, Optional

import httpx
import minicli


@dataclass(order=True)
class Dataset:
    nb_hits: int  # Keep it first for ordering.
    id: str  # Useful to deduplicate.
    title: str
    description: str
    acronym: Optional[str]
    page: str

    @property
    def asdict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "acronym": self.acronym,
            "page": self.page,
        }


async def fetch_json_data(url: str) -> dict:
    async with httpx.Client(base_url="https://www.data.gouv.fr") as client:
        response = await client.get(url, timeout=20.0)
        return response.json()


def convert_to_datasets(data: dict) -> List[Dataset]:
    return [
        Dataset(
            id=item["id"],
            nb_hits=item["metrics"].get("nb_hits", 0),
            title=item["title"],
            description=item["description"],
            acronym=item["acronym"],
            page=item["page"],
        )
        for item in data["data"]
    ]


def write_datasets(datasets: List[Dataset]) -> None:
    with open("datasets.json", "w") as file_out:
        file_out.write(json.dumps([dataset.asdict for dataset in datasets], indent=2))


@minicli.cli
async def generate_data(nb_datasets: int = 50) -> None:
    data = await fetch_json_data(f"/api/1/datasets/?page_size={nb_datasets}")
    datasets = convert_to_datasets(data)
    datasets_by_nb_hits = sorted(datasets, reverse=True)
    write_datasets(datasets_by_nb_hits)


@minicli.wrap
def perf_wrapper():
    start = perf_counter()
    yield
    elapsed = perf_counter() - start
    print(f"Done in {elapsed:.5f} seconds.")


if __name__ == "__main__":
    minicli.run()
