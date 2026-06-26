'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  Sparkles,
  ArrowUpDown,
  Package,
} from 'lucide-react';
import clsx from 'clsx';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { toast } from 'sonner';

// ── Mock Product Data ────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  status: 'Published' | 'Draft' | 'Archived';
  image: string;
  category: string;
}

const mockProducts: Product[] = [
  { id: '1', name: 'Smart Water Bottle Pro', sku: 'SWB-PRO-001', price: 49.99, stock: 124, status: 'Published', image: 'https://picsum.photos/seed/prod1/80/80', category: 'Bottles' },
  { id: '2', name: 'pH Test Kit Deluxe', sku: 'PHK-DLX-002', price: 89.00, stock: 67, status: 'Published', image: 'https://picsum.photos/seed/prod2/80/80', category: 'Testing' },
  { id: '3', name: 'Mineral Filter Cartridge 3-Pack', sku: 'MFC-003', price: 34.99, stock: 5, status: 'Published', image: 'https://picsum.photos/seed/prod3/80/80', category: 'Filters' },
  { id: '4', name: 'UV-C Sterilizer Wand', sku: 'UVS-WND-004', price: 129.99, stock: 42, status: 'Published', image: 'https://picsum.photos/seed/prod4/80/80', category: 'Sterilizers' },
  { id: '5', name: 'Heavy Metal Test Strips', sku: 'HMT-STR-005', price: 24.50, stock: 200, status: 'Published', image: 'https://picsum.photos/seed/prod5/80/80', category: 'Testing' },
  { id: '6', name: 'Portable TDS Meter', sku: 'TDS-MTR-006', price: 19.99, stock: 156, status: 'Published', image: 'https://picsum.photos/seed/prod6/80/80', category: 'Meters' },
  { id: '7', name: 'Reverse Osmosis Membrane', sku: 'ROM-MEM-007', price: 189.00, stock: 23, status: 'Published', image: 'https://picsum.photos/seed/prod7/80/80', category: 'Filters' },
  { id: '8', name: 'Water Distiller 4L', sku: 'WDS-4L-008', price: 299.99, stock: 8, status: 'Published', image: 'https://picsum.photos/seed/prod8/80/80', category: 'Distillers' },
  { id: '9', name: 'Alkaline Water Pitcher', sku: 'ALP-PCH-009', price: 39.99, stock: 89, status: 'Published', image: 'https://picsum.photos/seed/prod9/80/80', category: 'Pitchers' },
  { id: '10', name: 'Fluoride Filter Replacement', sku: 'FLF-RPL-010', price: 29.00, stock: 310, status: 'Published', image: 'https://picsum.photos/seed/prod10/80/80', category: 'Filters' },
  { id: '11', name: 'Stainless Steel Infuser Bottle', sku: 'SSI-BTL-011', price: 34.99, stock: 0, status: 'Draft', image: 'https://picsum.photos/seed/prod11/80/80', category: 'Bottles' },
  { id: '12', name: 'Chlorine Test Drops', sku: 'CLT-DRP-012', price: 12.99, stock: 450, status: 'Archived', image: 'https://picsum.photos/seed/prod12/80/80', category: 'Testing' },
  { id: '13', name: 'Collapsible Water Container 5L', sku: 'CWC-5L-013', price: 22.50, stock: 78, status: 'Draft', image: 'https://picsum.photos/seed/prod13/80/80', category: 'Containers' },
  { id: '14', name: 'Under-Sink Carbon Filter', sku: 'USC-FLT-014', price: 54.99, stock: 4, status: 'Published', image: 'https://picsum.photos/seed/prod14/80/80', category: 'Filters' },
  { id: '15', name: 'Digital Water Thermometer', sku: 'DWT-DIG-015', price: 15.99, stock: 95, status: 'Published', image: 'https://picsum.photos/seed/prod15/80/80', category: 'Meters' },
  { id: '16', name: 'Shower Head Filter', sku: 'SHF-FLT-016', price: 44.99, stock: 62, status: 'Published', image: 'https://picsum.photos/seed/prod16/80/80', category: 'Filters' },
  { id: '17', name: 'Emergency Water Filter Straw', sku: 'EWF-STR-017', price: 19.99, stock: 134, status: 'Archived', image: 'https://picsum.photos/seed/prod17/80/80', category: 'Filters' },
  { id: '18', name: 'Glass Water Dispenser 3Gal', sku: 'GWD-3G-018', price: 79.99, stock: 18, status: 'Published', image: 'https://picsum.photos/seed/prod18/80/80', category: 'Dispensers' },
  { id: '19', name: 'Bacteria Test Kit', sku: 'BTK-TST-019', price: 42.00, stock: 56, status: 'Draft', image: 'https://picsum.photos/seed/prod19/80/80', category: 'Testing' },
  { id: '20', name: 'Copper Water Bottle 1L', sku: 'CPB-1L-020', price: 36.99, stock: 71, status: 'Published', image: 'https://picsum.photos/seed/prod20/80/80', category: 'Bottles' },
  { id: '21', name: 'Water Hardness Test Strips', sku: 'WHT-STR-021', price: 9.99, stock: 520, status: 'Published', image: 'https://picsum.photos/seed/prod21/80/80', category: 'Testing' },
  { id: '22', name: 'Sediment Pre-Filter 10in', sku: 'SED-PF-022', price: 18.50, stock: 145, status: 'Published', image: 'https://picsum.photos/seed/prod22/80/80', category: 'Filters' },
  { id: '23', name: 'UV Lamp Replacement', sku: 'UVL-RPL-023', price: 45.00, stock: 3, status: 'Published', image: 'https://picsum.photos/seed/prod23/80/80', category: 'Parts' },
  { id: '24', name: 'Travel Filter Kit', sku: 'TFK-TRV-024', price: 59.99, stock: 37, status: 'Draft', image: 'https://picsum.photos/seed/prod24/80/80', category: 'Kits' },
  { id: '25', name: 'Whole House Filter System', sku: 'WHF-SYS-025', price: 549.99, stock: 11, status: 'Published', image: 'https://picsum.photos/seed/prod25/80/80', category: 'Systems' },
];

const statusColors: Record<string, string> = {
  Published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  Draft: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  Archived: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

// ── Page Component ───────────────────────────────────────────────────────────

export default function ProductsPage() {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [statusFilter, setStatusFilter] = useState('All');
  const [data] = useState<Product[]>(mockProducts);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Filtered data based on status
  const filteredData = useMemo(() => {
    if (statusFilter === 'All') return data;
    return data.filter((p) => p.status === statusFilter);
  }, [data, statusFilter]);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setGlobalFilter(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handleDelete = useCallback(
    (product: Product) => {
      toast.success(`Deleted "${product.name}"`, {
        description: 'Product has been moved to trash',
      });
    },
    []
  );

  const handleDuplicate = useCallback(
    (product: Product) => {
      toast.success(`Duplicated "${product.name}"`, {
        description: 'A copy has been created as a draft',
      });
    },
    []
  );

  const handleBulkDelete = useCallback(() => {
    const count = Object.keys(rowSelection).length;
    toast.success(`Deleted ${count} products`, {
      description: 'Selected products have been moved to trash',
    });
    setRowSelection({});
  }, [rowSelection]);

  const handleBulkStatusChange = useCallback(
    (newStatus: string) => {
      const count = Object.keys(rowSelection).length;
      toast.success(`Updated ${count} products`, {
        description: `Status changed to ${newStatus}`,
      });
      setRowSelection({});
    },
    [rowSelection]
  );

  // ── Table Columns ──────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-0"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-0"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        size: 40,
      },
      {
        accessorKey: 'image',
        header: '',
        cell: ({ row }) => (
          <img
            src={row.original.image}
            alt={row.original.name}
            className="w-10 h-10 rounded-lg object-cover bg-slate-800"
            width={40}
            height={40}
          />
        ),
        size: 56,
        enableSorting: false,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-xs font-medium text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
            onClick={() => column.toggleSorting()}
          >
            Name
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-semibold text-white">{row.original.name}</p>
            <p className="text-xs text-slate-500">{row.original.category}</p>
          </div>
        ),
      },
      {
        accessorKey: 'sku',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-xs font-medium text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
            onClick={() => column.toggleSorting()}
          >
            SKU
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-slate-400 font-mono">{row.original.sku}</span>
        ),
      },
      {
        accessorKey: 'price',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-xs font-medium text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
            onClick={() => column.toggleSorting()}
          >
            Price
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-slate-300 font-medium">
            ${row.original.price.toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: 'stock',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-xs font-medium text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
            onClick={() => column.toggleSorting()}
          >
            Stock
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => {
          const stock = row.original.stock;
          return (
            <div className="flex items-center gap-1.5">
              {stock < 10 && stock > 0 && (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              )}
              <span
                className={clsx(
                  'text-sm font-medium',
                  stock === 0
                    ? 'text-red-400'
                    : stock < 10
                      ? 'text-amber-400'
                      : 'text-slate-300'
                )}
              >
                {stock}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={clsx(
              'status-badge border',
              statusColors[row.original.status]
            )}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[10rem] bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1"
                sideOffset={4}
                align="end"
              >
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-md cursor-pointer outline-none"
                  onClick={() =>
                    toast.info(`Editing: ${row.original.name}`)
                  }
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-md cursor-pointer outline-none"
                  onClick={() => handleDuplicate(row.original)}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-slate-700 my-1" />
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-700 rounded-md cursor-pointer outline-none"
                  onClick={() => handleDelete(row.original)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ),
        size: 48,
        enableSorting: false,
      },
    ],
    [handleDelete, handleDuplicate]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
      columnFilters,
      sorting,
      rowSelection,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white sm:hidden">Products</h2>

      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search products..."
            defaultValue=""
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 text-sm bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="All">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>

          <button
            onClick={() => router.push('/products/scraper')}
            className="hidden sm:inline-flex items-center gap-1.5 h-10 px-4 text-sm font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Scraper
          </button>

          <button className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-600/10 border border-blue-500/20 rounded-lg animate-fade-in">
          <span className="text-sm font-medium text-blue-400">
            {selectedCount} selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 transition-colors">
                Change Status
                <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[10rem] bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1"
                sideOffset={4}
              >
                {['Published', 'Draft', 'Archived'].map((status) => (
                  <DropdownMenu.Item
                    key={status}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-md cursor-pointer outline-none"
                    onClick={() => handleBulkStatusChange(status)}
                  >
                    {status}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          <button
            onClick={() => setRowSelection({})}
            className="ml-auto p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="bg-slate-900 border-b border-slate-800 px-4 py-3 text-left whitespace-nowrap"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={clsx(
                    'border-b border-slate-800/50 transition-colors',
                    row.getIsSelected()
                      ? 'bg-blue-600/5'
                      : 'hover:bg-slate-800/30'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredData.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No products found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
          <p className="text-sm text-slate-400">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-400 bg-slate-800 border border-slate-700 rounded-lg hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-400 bg-slate-800 border border-slate-700 rounded-lg hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
