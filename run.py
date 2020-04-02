#!/usr/bin/env python3
import itertools
import json
import re
from dataclasses import dataclass
from time import perf_counter
from typing import Any, List, Optional

import bleach
import httpx
import markdown
import minicli
from jinja2 import Environment, FileSystemLoader
from progressist import ProgressBar
from selectolax import parser
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
    certified: bool
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
            "certified": self.certified,
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


async def fetch_json_data(url: str, headers: Optional[dict] = None) -> dict:
    async with httpx.AsyncClient(
        base_url="https://www.data.gouv.fr", headers=headers
    ) as client:
        try:
            response = await client.get(url, timeout=TIMEOUT)
        except httpx.exceptions.ReadTimeout:
            raise Exception(f"Timeout from {client.base_url}{url}")
        result = response.json()
        return {} if "message" in result else result


async def fetch_datagouv_page(url: str) -> List[str]:
    async with httpx.AsyncClient(base_url="https://www.data.gouv.fr") as client:
        try:
            response = await client.get(url, timeout=TIMEOUT)
        except httpx.exceptions.ReadTimeout:
            raise Exception(f"Timeout from {client.base_url}{url}")
        return response.text


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


async def extract_certified(item: dict) -> bool:
    if item["organization"]:
        organization_badges = await fetch_json_data(
            f"/api/1/organizations/{item['organization']['slug']}/",
            headers={"X-Fields": "badges"},
        )
        return any(
            badge["kind"] == "certified" for badge in organization_badges["badges"]
        )
    return False


async def convert_to_dataset(item: dict, index: int) -> Optional[Dataset]:
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
        certified=await extract_certified(item),
    )


def deduplicate_datasets(datasets: List[Dataset]) -> List[Dataset]:
    return set(datasets)


def write_datasets(datasets: List[Dataset], name="datasets.json") -> None:
    print(f"Writing {len(datasets)} datasets to {name}")
    data = [d.asdict for d in datasets]
    open(name, "w").write(json.dumps(data, indent=2))


def extract_slug(url: str) -> str:
    slug = url[len("https://www.data.gouv.fr/fr/datasets/") :]
    if slug.endswith("/"):
        slug = slug[:-1]
    return slug


def flatten(list_of_lists: List[List[Any]]) -> List[Any]:
    return list(itertools.chain(*list_of_lists))


async def fetch_datasets_from_urls(dataset_urls: List[str]) -> List[Dataset]:
    print("Fetching datasets from URLs.")
    dataset_slugs = [
        extract_slug(dataset_url)
        for dataset_url in dataset_urls
        if dataset_url.startswith("https://www.data.gouv.fr/fr/datasets/")
    ]
    datasets = []
    bar = ProgressBar(total=len(dataset_slugs))
    for i, dataset_slug in enumerate(bar.iter(dataset_slugs)):
        data = await fetch_json_data(
            f"/api/1/datasets/{dataset_slug}/",
            headers={
                "X-Fields": (
                    "id,title,metrics,description,acronym,page,"
                    "owner{first_name,last_name,avatar_thumbnail},"
                    "organization{name,slug,logo_thumbnail}"
                )
            },
        )
        if data and "id" in data:
            dataset = await convert_to_dataset(data, i)
            datasets.append(dataset)
    return datasets


async def fetch_playlist(playlist: Playlist) -> List[Dataset]:
    print(f"Fetching playlist {playlist.title}")
    dataset = await fetch_json_data(
        f"/api/1/datasets/{playlist.slug}/",
        headers={"X-Fields": "resources{title,url}"},
    )
    for resource in dataset["resources"]:
        if resource["title"] == playlist.title:
            dataset_urls = await fetch_datagouv_page(resource["url"])
    datasets = await fetch_datasets_from_urls(dataset_urls.split("\n"))
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


async def fetch_suivi_posts_urls():
    print("Fetching lists of suivi posts URLs.")
    posts_page = await fetch_datagouv_page("/fr/posts/")
    posts_urls = {
        post_link.attributes["href"]
        for post_link in parser.HTMLParser(posts_page).css(
            ".search-results .post-result a"
        )
        if "href" in post_link.attributes
        and "suivi-des-sorties" in post_link.attributes["href"]
    }
    return posts_urls


async def fetch_datasets_urls_from_posts_urls(suivi_posts_urls: List[str]) -> List[str]:
    print("Discovering datasets URLs from posts.")
    datasets_urls = []
    for suivi_post_url in suivi_posts_urls:
        post_page = await fetch_datagouv_page(suivi_post_url)
        datasets_urls.append(
            [
                link.attributes["href"]
                for link in parser.HTMLParser(post_page).css(".post-body a")
                if "href" in link.attributes
                and link.attributes["href"].startswith(
                    "https://www.data.gouv.fr/fr/datasets/"
                )
            ]
        )
    return flatten(datasets_urls)


@minicli.cli
async def fetch_datagouv_posts() -> None:
    suivi_posts_urls = await fetch_suivi_posts_urls()
    datasets_urls = await fetch_datasets_urls_from_posts_urls(suivi_posts_urls)
    datasets = await fetch_datasets_from_urls(datasets_urls)
    datasets = await fetch_statistics(datasets)
    write_datasets(sorted(datasets, reverse=True), name="datasets_posts.json")


async def fetch_matomo_crap() -> str:
    """Warning: quite fragile, we assume that from this page:

    https://stats.data.gouv.fr/index.php?module=CoreHome&action=index&idSite=109
    &period=range&date=previous30#?idSite=109&period=year&date=today&segment=
    &category=General_Actions&subcategory=General_Pages

    The first one is `fr` and the second one is `datasets` which is the most probable.

    This is the AJAX query performed by Matomo to display the data because the
    Matomo API and its documentation are a nightmare.
    """
    async with httpx.AsyncClient(base_url="https://stats.data.gouv.fr") as client:
        params = {
            "idSite": MATOMO_SITE_ID,
            "token_auth": "anonymous",
            "date": "today",
            "module": "Actions",
            "action": "getPageUrls",
            "period": "year",
            "search_recursive": "1",
            "keep_totals_row": "0",
            "filter_sort_column": "nb_visits",
            "filter_sort_order": "desc",
            "idSubtable": "2",
        }
        try:
            response = await client.get("/index.php", params=params, timeout=TIMEOUT)
        except httpx.exceptions.ReadTimeout:
            raise Exception(f"Timeout from {client.base_url}")
        return response.text


def dataset_slug_to_url(slug: str) -> str:
    return f"https://www.data.gouv.fr/fr/datasets/{slug}/"


async def fetch_popular_datasets_urls() -> List[str]:
    print("Fetching popular datasets from Matomo")
    matomo_crap = await fetch_matomo_crap()
    # Let's make it look like a regular HTML page.
    matomo_crap = (
        f"<!doctype html><html><body><table>{matomo_crap}</table></body></html>"
    )
    datasets_urls = [
        dataset_slug_to_url(dataset_slug.text().strip())
        for dataset_slug in parser.HTMLParser(matomo_crap).css("tr td.first")
        if not dataset_slug.text().strip().startswith("/")
        and dataset_slug.text().strip() != "Others"
    ]
    return datasets_urls


@minicli.cli
async def generate_data() -> None:
    playlists = [
        Playlist(slug="mes-playlists-13", title="SPD"),
    ]
    playlists_datasets = await fetch_playlists(playlists)

    suivi_posts_urls = await fetch_suivi_posts_urls()
    suivi_datasets_urls = await fetch_datasets_urls_from_posts_urls(suivi_posts_urls)
    posts_datasets = await fetch_datasets_from_urls(suivi_datasets_urls)

    popular_datasets_urls = await fetch_popular_datasets_urls()
    popular_datasets = await fetch_datasets_from_urls(popular_datasets_urls)

    datasets = deduplicate_datasets(
        playlists_datasets + posts_datasets + popular_datasets
    )
    datasets = await fetch_statistics(datasets)
    write_datasets(sorted(datasets, reverse=True))


@minicli.wrap
def perf_wrapper():
    start = perf_counter()
    yield
    elapsed = perf_counter() - start
    print(f"Done in {elapsed:.5f} seconds.")


if __name__ == "__main__":
    minicli.run()
