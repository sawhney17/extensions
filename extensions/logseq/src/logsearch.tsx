import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import MiniSearch from "minisearch";
import { getPreferenceValues } from "@raycast/api";

import {
  formatFilePath,
  formatResult,
  getFilesInDir,
  getUserConfiguredGraphPath,
  showGraphPathInvalidToast,
  validateUserConfigGraphPath,
} from "./utils";
export default function Command() {
  const { state, search } = useSearch();
  validateUserConfigGraphPath().catch(() => {
    showGraphPathInvalidToast();
  });

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search Logseq Database..."
      throttle
    >
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.name} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  //This is what happens when the item is clicked
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.description}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in Logseq"
              url={searchResult.url}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    isLoading: true,
  });

  const search = useCallback(
    async function search(searchText: string) {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await performSearch(searchText);
        setState((oldState) => ({
          ...oldState,
          results: results,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        console.error("search error", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Could not perform search",
          message: String(error),
        });
      }
    },
    [setState]
  );

  useEffect(() => {
    search("");
    return () => {};
  }, []);

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string): Promise<SearchResult[]> {
  let finalSearchResults: SearchResult[] = [];
  await getFilesInDir(getUserConfiguredGraphPath() + "/pages").then(
    (result) => {
      if (getPreferenceValues().smartSearch == true && searchText.length > 0) { 
        let finalInitialResult: SearchResult[] = [];
        //looping through entire database to see a match
        result.forEach((element) => {
          if (element.endsWith(".md")) {
            //Making sure only MD files are shown
            finalInitialResult.push({
              name: formatResult(element),
              description: element,
              url: formatFilePath(element),
            });
          }
        });
        //use the minisearch index
        let miniSearch = new MiniSearch({
          fields: ["name"], // fields to index for full-text se¨¨arch
          storeFields: ["name", "url"], // fields to return with search results
          idField: "name",
        });
        miniSearch.addAll(finalInitialResult);

        //  assingn final result to the return value of the search
        let rawSearchResults = miniSearch.search(searchText);

        for (const rawSearchResult in rawSearchResults) {
          finalSearchResults.push({
            name: rawSearchResults[rawSearchResult].name,
            description: rawSearchResults[rawSearchResult].url,
            url: rawSearchResults[rawSearchResult].url,
          });
        }
      }
      else {
        result.forEach((element) => {
          if (element.endsWith(".md") && element.toLowerCase().includes(searchText.toLowerCase())) {
            //Making sure only MD files are shown
            finalSearchResults.push({
              name: formatResult(element),
              description: element,
              url: formatFilePath(element),
            });
          }
        });
      }
    }
  );
  return finalSearchResults;
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  name: string;
  score?: number;
  terms?: string[];
  description?: string;
  url: string;
}
