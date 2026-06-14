// Temporary mock implementation of the Supabase client to route calls to local API/Neon DB
import { genericQueryFn, genericRpcFn } from "@/lib/supabaseMock";

const mockSupabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signInWithPassword: async (args: any) => ({ data: {}, error: null }),
    signUp: async (args: any) => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
    mfa: {
      listFactors: async () => ({ data: { totp: [] }, error: null }),
      challenge: async (args: any) => ({ data: { id: "mock" }, error: null }),
      verify: async (args: any) => ({ error: null }),
      unenroll: async (args: any) => ({ error: null }),
      enroll: async (args: any) => ({
        data: { id: "mock-enroll", totp: { qr_code: "" } },
        error: null,
      }),
    },
  },
  from: (table: string) => {
    return {
      select: (columns: string = "*") => {
        const state = {
          eq: {} as Record<string, any>,
          gt: {} as Record<string, any>,
          order: null as any,
        };

        const builder: any = Promise.resolve()
          .then(() =>
            genericQueryFn({ data: { table, action: "select", query: state } }),
          )
          .then((res) => ({ data: res.data || [], error: res.error }));

        builder.eq = (col: string, val: any) => {
          state.eq[col] = val;
          return builder;
        };
        builder.gt = (col: string, val: any) => {
          state.gt[col] = val;
          return builder;
        };
        builder.order = (col: string, opts: any) => {
          state.order = { col, ...opts };
          return builder;
        };
        builder.maybeSingle = async () => {
          const res = await genericQueryFn({
            data: { table, action: "select", query: state },
          });
          return {
            data: Array.isArray(res.data) ? res.data[0] || null : null,
            error: res.error,
          };
        };
        builder.single = async () => {
          const res = await genericQueryFn({
            data: { table, action: "select", query: state },
          });
          return {
            data: Array.isArray(res.data) ? res.data[0] || null : null,
            error: res.error,
          };
        };

        return builder;
      },
      insert: (body: any) => {
        const obj: any = {
          select: (columns?: string) => {
            const selectObj: any = {
              single: async () => {
                const res = await genericQueryFn({
                  data: { table, action: "insert", body },
                });
                return {
                  data: res.data,
                  error: res.error,
                };
              },
            };
            return selectObj;
          },
        };
        return obj;
      },
      update: (body: any) => {
        const state = { eq: {} as Record<string, any> };
        const obj: any = {
          eq: (col: string, val: any) => {
            state.eq[col] = val;
            const eqObj: any = {
              select: (columns?: string) => {
                const selectObj: any = {
                  single: async () => {
                    const res = await genericQueryFn({
                      data: { table, action: "update", body, query: state },
                    });
                    return {
                      data: res.data,
                      error: res.error,
                    };
                  },
                };
                return selectObj;
              },
            };
            return eqObj;
          },
        };
        return obj;
      },
      delete: () => {
        const state = { eq: {} as Record<string, any> };
        const builder: any = Promise.resolve().then(() => ({
          data: null,
          error: null,
        }));
        builder.eq = (col: string, val: any) => {
          state.eq[col] = val;
          return builder;
        };
        return builder;
      },
      upsert: (body: any, options?: any) => {
        const obj: any = {
          eq: (col: string, val: any) => {
            const eqObj: any = {
              select: (columns?: string) => {
                return Promise.resolve({ data: body, error: null });
              },
            };
            return eqObj;
          },
          select: (columns?: string) => {
            return Promise.resolve({ data: [body], error: null });
          },
        };
        return obj;
      },
    };
  },
  rpc: async (fn: string, args?: any) => {
    return await genericRpcFn({ data: { fn, args } });
  },
  channel: (name?: string) => {
    return {
      on: (event: string, filter: any, callback: any) => ({
        subscribe: () => ({}),
      }),
      subscribe: () => ({}),
    };
  },
  removeChannel: (channel: any) => {},
  functions: {
    invoke: async (fnName: string, options?: any) => {
      // Return a mock payload to satisfy typing across the app
      return {
        data: {
          address: "mock-addr",
          balance: 0,
          confirmations: 0,
          status: "pending",
          underpaid: false,
        },
        error: null,
      };
    },
  },
};

export const supabase: any = mockSupabase;
