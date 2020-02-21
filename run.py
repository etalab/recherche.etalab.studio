#!/usr/bin/env python3
import itertools
import json
import re
import string
from dataclasses import dataclass
from time import perf_counter
from typing import Any, List, Optional

import bleach
import httpx
import markdown
import minicli
from jinja2 import Environment, FileSystemLoader
from progressist import ProgressBar
from truncate import Truncator

environment = Environment(loader=FileSystemLoader("."))

MATOMO_SITE_ID = 109
TIMEOUT = httpx.Timeout(15, read_timeout=60)


@dataclass
class Playlist:
    slug: str
    title: str


@dataclass(order=True)
class Dataset:
    nb_hits: int  # Keep it first for ordering.
    default_order: int  # Keep it second for ordering.
    id: str  # Useful to deduplicate.
    title: str
    source: str
    page: str
    acronym: Optional[str]
    post_url: Optional[str]
    logo_url: Optional[str]
    description: str
    excerpt: Optional[str] = ""

    def __post_init__(self) -> None:
        html_description = markdown.markdown(self.description)
        self.populate_excerpt(html_description)

    def __hash__(self) -> int:
        """Required for deduplication via set()."""
        return hash(self.id)

    def __eq__(self, other: "Dataset") -> bool:
        """Required for deduplication via set()."""
        if isinstance(other, Dataset):
            return self.id == other.id
        raise NotImplementedError

    def populate_excerpt(self, html_description: str, num_words: int = 50) -> None:
        sanitized_description = bleach.clean(
            html_description, tags=["p", "li", "ol", "ul",], strip=True,
        )
        truncated_description = Truncator(sanitized_description).words(
            num=num_words, truncate="…", html=True
        )
        if len(truncated_description) > num_words * 10:
            # May happen with Data INSEE sur les communes given the description
            # https://www.data.gouv.fr/fr/datasets/data-insee-sur-les-communes/
            truncated_description = Truncator(truncated_description).chars(
                num=num_words * 10, truncate="…", html=True
            )
        self.excerpt = re.sub(r"http\S+", "", truncated_description)

    @property
    def asdict(self):
        return {
            "id": self.id,
            "title": self.title,
            "source": self.source,
            "excerpt": self.excerpt,
            "acronym": self.acronym,
            "page": self.page,
            "post_url": self.post_url,
            "logo_url": self.logo_url,
        }


async def fetch_stats_for(url: str) -> dict:
    async with httpx.AsyncClient(base_url="https://stats.data.gouv.fr") as client:
        params = {
            "idSite": MATOMO_SITE_ID,
            "module": "API",
            "method": "Actions.getPageUrl",
            "pageUrl": url,
            "format": "json",
            "period": "year",
            "date": "last1",
            "token_auth": "anonymous",
        }
        try:
            response = await client.get("/", params=params, timeout=TIMEOUT)
        except httpx.exceptions.ReadTimeout:
            raise Exception(f"Timeout from {client.base_url}{url}")
        return response.json()


async def fetch_json_data(url: str) -> dict:
    async with httpx.AsyncClient(base_url="https://www.data.gouv.fr") as client:
        try:
            response = await client.get(url, timeout=TIMEOUT)
        except httpx.exceptions.ReadTimeout:
            raise Exception(f"Timeout from {client.base_url}{url}")
        result = response.json()
        return {} if "message" in result else result


async def fetch_url_list(url: str) -> List[str]:
    async with httpx.AsyncClient(base_url="https://www.data.gouv.fr") as client:
        try:
            response = await client.get(url, timeout=TIMEOUT)
        except httpx.exceptions.ReadTimeout:
            raise Exception(f"Timeout from {client.base_url}{url}")
        return response.text.split("\n")


def extract_source(item: dict) -> str:
    if item["organization"]:
        source = item["organization"]["name"]
    elif item["owner"]:
        source = f"{item['owner']['first_name']} {item['owner']['last_name']}"
    else:
        source = "Source inconnue"
    return source


def extract_logo_url(item: dict) -> str:
    if item["organization"]:
        logo_url = item["organization"]["logo_thumbnail"]
    elif item["owner"]:
        logo_url = item["owner"]["avatar_thumbnail"]
    else:
        logo_url = ""
    return logo_url


def convert_to_dataset(item: dict, index: int) -> Optional[Dataset]:
    return Dataset(
        nb_hits=item["metrics"].get("nb_hits", 0),
        default_order=index,
        id=item["id"],
        title=item["title"],
        source=extract_source(item),
        description=item["description"],
        acronym=item["acronym"],
        page=item["page"],
        post_url="",
        logo_url=extract_logo_url(item),
    )


def deduplicate_datasets(datasets: List[Dataset]) -> List[Dataset]:
    return set(datasets)


def write_datasets(datasets: List[Dataset]) -> None:
    data = [d.asdict for d in datasets]
    open("datasets.json", "w").write(json.dumps(data, indent=2))


def extract_slug(url: str) -> str:
    slug = url[len("https://www.data.gouv.fr/fr/datasets/") :]
    if slug.endswith("/"):
        slug = slug[:-1]
    return slug


def flatten(list_of_lists: List[List[Any]]) -> List[Any]:
    return list(itertools.chain(*list_of_lists))


async def fetch_playlist(playlist: Playlist) -> List[Dataset]:
    print(f"Fetching playlist {playlist.title}")
    dataset = await fetch_json_data(f"/api/1/datasets/{playlist.slug}/")
    for resource in dataset["resources"]:
        if resource["title"] == playlist.title:
            dataset_urls = await fetch_url_list(resource["url"])
    dataset_slugs = [
        extract_slug(dataset_url)
        for dataset_url in dataset_urls
        if dataset_url.startswith("https://www.data.gouv.fr/fr/datasets/")
    ]
    datasets = []
    bar = ProgressBar(total=len(dataset_slugs))
    for i, dataset_slug in enumerate(bar.iter(dataset_slugs)):
        data = await fetch_json_data(f"/api/1/datasets/{dataset_slug}/")
        if data and "id" in data:
            dataset = convert_to_dataset(data, i)
            datasets.append(dataset)
    return datasets


async def fetch_playlists(playlists: List[Playlist]) -> List[Dataset]:
    return flatten([await fetch_playlist(playlist) for playlist in playlists])


async def fetch_statistics(datasets: List[Dataset]) -> List[Dataset]:
    print(f"Fetching statistics")
    nb_updated_datasets = 0
    bar = ProgressBar(total=len(datasets))
    for dataset in bar.iter(datasets):
        results = await fetch_stats_for(dataset.page)
        if results["2020"]:
            dataset.nb_hits = results["2020"][0]["nb_hits"]
            nb_updated_datasets += 1
    print(f"{nb_updated_datasets} datasets updated from Matomo")
    return datasets


@minicli.cli
async def generate_data() -> None:
    playlists = [
        Playlist(
            slug="jeux-de-donnees-contenus-dans-les-articles-de-blog-de-www-data-gouv-fr",
            title="Suivi des sorties - Novembre 2019",
        ),
        Playlist(slug="mes-playlists-13", title="SPD"),
        Playlist(
            slug="jeux-de-donnees-du-top-100",
            title="Top 100 des jeux de données en 2019",
        ),
    ]
    playlists_datasets = await fetch_playlists(playlists)
    datasets = deduplicate_datasets(playlists_datasets)
    datasets = await fetch_statistics(datasets)
    print(f"Writing {len(datasets)} datasets to datasets.json")
    write_datasets(sorted(datasets, reverse=True))


@minicli.wrap
def perf_wrapper():
    start = perf_counter()
    yield
    elapsed = perf_counter() - start
    print(f"Done in {elapsed:.5f} seconds.")


if __name__ == "__main__":
    minicli.run()
