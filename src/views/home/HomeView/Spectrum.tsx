import React, { useState, useEffect, FC, ChangeEvent } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import * as xlsx from 'xlsx';
import _ from 'underscore';
import {
  Grid,
  Box,
  Typography,
  makeStyles,
  Theme,
  colors,
  Tooltip
} from '@material-ui/core';
import { Pagination } from '@material-ui/lab';
import { Band } from 'src/types/band';
import { DATA_FILE } from 'src/constants';

interface Status {
  system: string;
  band: string;
  scope: number | null;
}
interface SpectrumProps {
  className?: string;
  uids: number[];
  status: Status;
  onContent: (param: string) => void;
  onChange: (name: string, value: string | number) => void;
}

const calWidth = (start: number, end: number, length: number) => {
  const value = (Math.abs(start - end) / length) * 95;
  return { width: value + '%' };
};

const getKey = (value: string): string => {
  return value.split(' ').join('_');
};

const getStyle = (dt: Band, length: number) => {
  const len = 40 / length + 'vh';
  let value = {};

  if (dt.vertical) {
    value = {
      writingMode: 'vertical-rl',
      backgroundColor: dt.hex,
      minHeight: len,
      maxHeight: len,
      transform: 'rotate(-180deg)'
    };
  } else {
    value = {
      backgroundColor: dt.hex,
      minHeight: len,
      maxHeight: len,
      textAlign: 'center'
    };
  }

  return value;
};

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    position: 'relative'
  },
  grid: {
    minHeight: theme.spacing(2),
    '&:before': {
      content: 'attr(data-start)'
    },
    '&:after': {
      content: 'attr(data-end)',
      position: 'absolute',
      right: theme.spacing(3),
      top: 0
    }
  },
  block: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px solid #000',
    cursor: 'pointer'
  },
  scoped: {
    border: `3px dashed ${colors.red[700]}`
  },
  service: {
    fontSize: theme.typography.pxToRem(12)
  },
  remark: {
    fontSize: theme.typography.pxToRem(10)
  },
  announce: {
    marginTop: theme.spacing(1)
  },
  box: {
    width: '100%',
    minHeight: theme.spacing(30),
    justifyContent: 'center',
    alignItems: 'center',
    display: 'flex'
  },
  clicked: {
    boxShadow: theme.shadows[15],
    border: `4px dashed ${colors.red[700]}`,
    zIndex: 1000
  }
}));

const Spectrum: FC<SpectrumProps> = ({
  className,
  uids,
  status,
  onChange,
  onContent
}) => {
  const [source, setSource] = useState([]);
  const [dataSource, setDataSource] = useState([]);
  const [length, setLength] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const classes = useStyles();
  const amount = 8;

  useEffect(() => {
    let req = new XMLHttpRequest();
    req.open('GET', DATA_FILE, true);
    req.responseType = 'arraybuffer';

    req.onload = (e: ProgressEvent<EventTarget>) => {
      const data = new Uint8Array(req.response);
      const workbook = xlsx.read(data, { type: 'array' });
      const worksheet: any = xlsx.utils.sheet_to_json(
        workbook.Sheets[status.band],
        {
          header: 1
        }
      );
      let sheetList = [];
      let result = [];

      if (Object.keys(worksheet).length > 2) {
        worksheet.forEach((el: any, idx: number) => {
          if (idx > 0) sheetList.push(_.object(worksheet[0], el));
        });

        sheetList.forEach((item: Band) => {
          const data = sheetList.filter(el => item.master === el.master);
          const count = _.filter(result, el => item.master === el.master);

          if (count.length < 1 && item.master) {
            result.push({
              master: item.master,
              start: item.start,
              end: item.end,
              data: data,
              vertical: item.vertical
            });
          }
        });
        setSource(result);
        setTotalPage(Object.keys(result).length / amount);
        onContent(result[0].data[0].content);
      } else {
        handleInit();
      }
    };

    req.send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.band]);

  useEffect(() => {
    if (Object.keys(source).length > 0) {
      const pointS = source[(page - 1) * amount];
      const pointF =
        page < totalPage
          ? source[page * amount - 1]
          : source[totalPage * amount - 1];

      if (pointF && Object.keys(pointF).includes('end')) {
        const start = pointS.start ? pointS.start : 0;
        const end = pointF.end ? pointF.end : 0;
        const len = Math.abs(start - end);

        let data = Object.values(source).filter(
          (item: Band) =>
            item.master > (page - 1) * amount && item.master <= page * amount
        );
        setLength(len);
        setDataSource(data);
      }
    } else {
      setLength(0);
      setDataSource([]);
    }
  }, [page, source, totalPage]);

  const handleInit = (): void => {
    setSource([]);
    setTotalPage(0);
    setPage(1);
    onChange('scope', null);
    onContent('');
  };

  const handleClick = (value: number, content: string): void => {
    onChange('scope', value);
    onContent(content);
  };

  const handleChangePage = (e: ChangeEvent, page: number): void => {
    setPage(page);
  };

  return (
    <>
      <Grid
        container
        alignItems="center"
        justify="center"
        style={{ position: 'relative' }}
        className={clsx(className, classes.root)}
      >
        {Object.keys(dataSource).length === 0 && (
          <Box
            border={1}
            borderColor={colors.blue[200]}
            className={classes.box}
            textAlign="center"
          >
            <Typography variant="body2" color="textSecondary">
              No Band Data Entered Yet.
            </Typography>
          </Box>
        )}
        {Object.keys(dataSource).length > 0 &&
          Object.values(dataSource).map((el, idx: number) => (
            <Grid
              item
              key={el.master}
              className={classes.grid}
              style={calWidth(el.start, el.end, length)}
              data-start={el.start}
              data-end={idx === amount - 1 ? el.end : ''}
            >
              <Grid container alignItems="center" justify="center">
                {el.data.map((dt: Band, index: number) => (
                  <Tooltip
                    key={`${getKey(dt.service)}-${idx}-${index}`}
                    title={dt.service}
                    arrow
                  >
                    <Grid
                      item
                      md={12}
                      onClick={() => handleClick(dt.Item_No, dt.content)}
                      style={getStyle(dt, el.data.length)}
                      className={clsx(
                        classes.block,
                        uids.includes(dt.Item_No) && classes.scoped,
                        uids.includes(dt.Item_No) &&
                          dt.Item_No === status.scope &&
                          classes.clicked
                      )}
                    >
                      {!dt.truncated ? (
                        <>
                          <Typography className={classes.service}>
                            {dt.service}
                          </Typography>
                          {dt.remark !== '' && (
                            <Typography className={classes.remark}>
                              {dt.remark}
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Typography className={classes.service}>
                          {dt.truncated}
                        </Typography>
                      )}
                    </Grid>
                  </Tooltip>
                ))}
              </Grid>
            </Grid>
          ))}
      </Grid>
      <Grid
        container
        alignItems="center"
        spacing={3}
        className={classes.announce}
      >
        <Grid item md={9}>
          <Typography variant="body2" component="p">
            This chart will only work with 1024 x 768. We recommend full screen
            mode.
          </Typography>
        </Grid>
        <Grid item md={3}>
          <Grid container justify="flex-end">
            <Grid item md={12}>
              <Pagination
                count={Math.ceil(totalPage)}
                page={page}
                defaultPage={1}
                variant="outlined"
                shape="rounded"
                onChange={handleChangePage}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

Spectrum.propTypes = {
  className: PropTypes.string,
  uids: PropTypes.array,
  onChange: PropTypes.func,
  onContent: PropTypes.func
};

export default Spectrum;
