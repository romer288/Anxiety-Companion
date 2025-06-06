import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    console.log(`Making ${method} request to ${url}`, data ? `with data: ${JSON.stringify(data)}` : 'without data');
    
    const headers: Record<string, string> = {};
    if (data) {
      headers["Content-Type"] = "application/json";
    }
    
    const requestOptions: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    };
    
    console.log("Request options:", JSON.stringify(requestOptions));
    
    const res = await fetch(url, requestOptions);
    
    console.log(`Response status: ${res.status} ${res.statusText}`);
    
    // Don't throw an error here, let the calling function decide how to handle it
    return res;
  } catch (error) {
    console.error(`API request error (${method} ${url}):`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      console.log(`Query request for key: ${JSON.stringify(queryKey)}`);
      
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
      
      console.log(`Query response status: ${res.status} ${res.statusText}`);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log("Unauthorized request (401), returning null as configured");
        return null;
      }
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Query error (${res.status}): ${errorText}`);
        throw new Error(`${res.status}: ${errorText || res.statusText}`);
      }
      
      const data = await res.json();
      console.log(`Query data received:`, data);
      return data;
    } catch (error) {
      console.error(`Query error for ${queryKey[0]}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
