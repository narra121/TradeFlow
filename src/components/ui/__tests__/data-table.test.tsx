import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type DataColumn } from '../data-table';

interface Row {
  id: string;
  name: string;
  qty: number;
}

const rows: Row[] = [
  { id: 'a', name: 'Alpha', qty: 1 },
  { id: 'b', name: 'Beta', qty: 2 },
  { id: 'c', name: 'Gamma', qty: 3 },
];

const columns: DataColumn<Row>[] = [
  { id: 'name', header: 'Name', sortable: true, cell: (r) => r.name },
  { id: 'qty', header: 'Qty', sortable: true, align: 'right', cell: (r) => r.qty },
];

const dataRows = () => screen.getAllByRole('row').filter((r) => r.hasAttribute('data-row-id'));

describe('DataTable', () => {
  it('renders a captioned table with header buttons and aria-sort', async () => {
    const onSort = vi.fn();
    render(<DataTable caption="Things" rows={rows} columns={columns} getRowId={(r) => r.id} sort={{ id: 'qty', dir: 'desc' }} onSort={onSort} />);
    expect(screen.getByRole('table', { name: 'Things' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Qty/ })).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'none');
    await userEvent.click(screen.getByRole('button', { name: /Name/ }));
    expect(onSort).toHaveBeenCalledWith('name');
  });

  it('opens a row with Enter and moves between rows with the arrow keys', async () => {
    const onRowOpen = vi.fn();
    render(<DataTable caption="Things" rows={rows} columns={columns} getRowId={(r) => r.id} onRowOpen={onRowOpen} />);
    dataRows()[0].focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(dataRows()[1]).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onRowOpen).toHaveBeenCalledWith(rows[1]);
  });

  it('selects with the checkbox and with x, and reports the header state', async () => {
    const onToggle = vi.fn();
    const onTogglePage = vi.fn();
    render(
      <DataTable
        caption="Things"
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        selection={{ selected: new Set(['a']), onToggle, onTogglePage, label: (id) => `Select ${id}` }}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select b' }));
    expect(onToggle).toHaveBeenCalledWith('b', { shiftKey: false });
    dataRows()[2].focus();
    await userEvent.keyboard('x');
    expect(onToggle).toHaveBeenCalledWith('c', { shiftKey: false });
    expect(screen.getByRole('checkbox', { name: 'Select all rows shown' })).toHaveAttribute('data-state', 'indeterminate');
  });

  it('groups rows under collapsible headers', async () => {
    const onToggleGroup = vi.fn();
    render(
      <DataTable
        caption="Things"
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        groups={[
          { key: 'g1', label: 'First', rows: [rows[0]], meta: '1 · 1W 0L', summary: '+10' },
          { key: 'g2', label: 'Second', rows: [rows[1], rows[2]] },
        ]}
        collapsed={new Set(['g2'])}
        onToggleGroup={onToggleGroup}
      />,
    );
    expect(screen.getByRole('rowheader', { name: /First/ })).toBeInTheDocument();
    expect(dataRows()).toHaveLength(1);
    const header = screen.getByRole('rowheader', { name: /Second/ });
    expect(within(header).getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(within(header).getByRole('button'));
    expect(onToggleGroup).toHaveBeenCalledWith('g2');
  });

  it('marks the open row and sizes rows by density', () => {
    const { rerender } = render(<DataTable caption="Things" rows={rows} columns={columns} getRowId={(r) => r.id} openId="b" />);
    expect(dataRows()[1]).toHaveAttribute('data-state', 'open');
    expect(dataRows()[0].className).toContain('h-9');
    rerender(<DataTable caption="Things" rows={rows} columns={columns} getRowId={(r) => r.id} density="compact" />);
    expect(dataRows()[0].className).toContain('h-7');
  });
});

describe('DataTable (E-041, E-034, E-035, R-fe-app-009)', () => {
  const many: Row[] = Array.from({ length: 5000 }, (_, i) => ({ id: `r${i}`, name: `Row ${i}`, qty: i }));

  it('is one tab stop: only the cursor row has tabindex 0, and the row checkbox is out of the tab order', () => {
    render(<DataTable caption="Things" rows={rows} columns={columns} getRowId={(r) => r.id} selection={{ selected: new Set(), onToggle: vi.fn(), onTogglePage: vi.fn(), label: (id) => `Select ${id}` }} />);
    expect(dataRows().filter((r) => r.getAttribute('tabindex') === '0')).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: 'Select a' })).toHaveAttribute('tabindex', '-1');
  });

  it('mounts only the rows near the viewport of a 5,000-row list and keeps the row count for assistive tech', () => {
    render(<DataTable caption="Things" rows={many} columns={columns} getRowId={(r) => r.id} virtualize />);
    expect(dataRows().length).toBeLessThanOrEqual(60);
    expect(dataRows().length).toBeGreaterThan(0);
    expect(screen.getByRole('table', { name: 'Things' })).toHaveAttribute('aria-rowcount', '5001');
  });

  it('keeps the whole list mounted without virtualize', () => {
    render(<DataTable caption="Things" rows={many.slice(0, 200)} columns={columns} getRowId={(r) => r.id} />);
    expect(dataRows()).toHaveLength(200);
  });

  it('opens a header menu from the caret and from Alt+ArrowDown on the header', async () => {
    const menu = (c: DataColumn<Row>) => (c.id === 'name' ? <div role="menuitem">Hide column</div> : null);
    render(<DataTable caption="Things" rows={rows} columns={columns} getRowId={(r) => r.id} onSort={vi.fn()} renderHeaderMenu={menu} />);
    expect(screen.queryByRole('button', { name: 'Qty column menu' })).toBeNull();
    screen.getByRole('button', { name: 'Name' }).focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(await screen.findByRole('menuitem', { name: 'Hide column' })).toBeInTheDocument();
  });

  it('resizes a column by keyboard, resets it with Enter and reports widths through the handler', async () => {
    const onResize = vi.fn();
    const cols: DataColumn<Row>[] = [{ ...columns[0], resizable: true }, columns[1]];
    render(<DataTable caption="Things" rows={rows} columns={cols} getRowId={(r) => r.id} columnWidths={{ name: 120 }} onResizeColumn={onResize} />);
    const handle = screen.getByRole('separator', { name: 'Resize Name column' });
    handle.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onResize).toHaveBeenLastCalledWith('name', 128);
    await userEvent.keyboard('{ArrowLeft}');
    expect(onResize).toHaveBeenLastCalledWith('name', 112);
    await userEvent.keyboard('{Enter}');
    expect(onResize).toHaveBeenLastCalledWith('name', null);
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveStyle({ width: '120px' });
  });
});
