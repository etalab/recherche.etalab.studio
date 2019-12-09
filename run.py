#!/usr/bin/env python3
import json
import re
from dataclasses import dataclass
from time import perf_counter
from typing import List, Optional

import markdown

import bleach
import httpx
import minicli
from truncate import Truncator


@dataclass(order=True)
class Dataset:
    nb_hits: int  # Keep it first for ordering.
    default_order: int  # Keep it second for ordering.
    id: str  # Useful to deduplicate.
    title: str
    description: str
    page: str
    acronym: Optional[str]
    post_url: Optional[str]
    description_excerpt: Optional[str] = ""

    def __post_init__(self):
        html_description = markdown.markdown(self.description)
        sanitized_description = bleach.clean(
            html_description, tags=["p", "li", "ol", "ul",], strip=True,
        )
        self.description = sanitized_description
        truncated_description = Truncator(sanitized_description).words(
            num=50, truncate="…", html=True
        )
        unlinkified_description = re.sub(r"http\S+", "", truncated_description)
        self.description_excerpt = unlinkified_description

    @property
    def asdict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "content": self.description_excerpt,
            "acronym": self.acronym,
            "page": self.page,
            "post_url": self.post_url,
            # "nb_hits": self.nb_hits,
            # "default_order": self.default_order,
        }


async def fetch_json_data(url: str) -> dict:
    async with httpx.Client(base_url="https://www.data.gouv.fr") as client:
        response = await client.get(url, timeout=20.0)
        return response.json()


def convert_to_dataset(item: dict, index: int) -> Dataset:
    return Dataset(
        nb_hits=item["metrics"].get("nb_hits", 0),
        default_order=index,
        id=item["id"],
        title=item["title"],
        description=item["description"],
        acronym=item["acronym"],
        page=item["page"],
        post_url="",
    )


def write_datasets(datasets: List[Dataset]) -> None:
    with open("datasets.json", "w") as file_out:
        file_out.write(json.dumps([dataset.asdict for dataset in datasets], indent=2))


async def fetch_popular_datasets_by_nb_hits(nb_datasets: int) -> List[Dataset]:
    data = await fetch_json_data(f"/api/1/datasets/?page_size={nb_datasets}")
    datasets = [
        convert_to_dataset(item, i) for i, item in enumerate(reversed(data["data"]))
    ]
    return sorted(datasets, reverse=True)


async def fetch_blog_datasets_by_nb_hits(nb_blogposts: int) -> List[Dataset]:
    blogposts = await fetch_json_data(
        f"/api/1/posts/?page=1&page_size={nb_blogposts}&sort=-created_at"
    )
    datasets = []
    for blogpost in blogposts["data"]:
        post_url = blogpost["page"]
        for i, dataset in enumerate(reversed(blogpost["datasets"])):
            data = await fetch_json_data(dataset["uri"])
            dataset = convert_to_dataset(data, i)
            dataset.post_url = post_url
            datasets.append(dataset)

    return sorted(datasets, reverse=True)


@minicli.cli
async def generate_data(nb_datasets: int = 50, nb_blogposts: int = 2) -> None:
    popular_datasets_by_nb_hits = await fetch_popular_datasets_by_nb_hits(nb_datasets)
    blog_datasets_by_nb_hits = await fetch_blog_datasets_by_nb_hits(nb_blogposts)
    write_datasets(blog_datasets_by_nb_hits + popular_datasets_by_nb_hits)


@minicli.wrap
def perf_wrapper():
    start = perf_counter()
    yield
    elapsed = perf_counter() - start
    print(f"Done in {elapsed:.5f} seconds.")


if __name__ == "__main__":
    minicli.run()
