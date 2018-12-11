/* Copyright (c) 2014-2016 Jason Ish
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

import {Component, OnDestroy, OnInit} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {ElasticSearchService} from "./elasticsearch.service";
import {MousetrapService} from "./mousetrap.service";
import {AppService} from "./app.service";
import {ToastrService} from "./toastr.service";
import {EveboxSubscriptionService} from "./subscription.service";
import {loadingAnimation} from "./animations";
import {ApiService} from "./api.service";
import {finalize} from "rxjs/operators";
import {EVENT_TYPES} from './shared/eventtypes';

@Component({
    template: `
      <loading-spinner [loading]="loading"></loading-spinner>

      <div class="content"
           [@loadingState]="loading ? 'true' : 'false'">

        <br/>

        <div class="row">
          <div class="col-md">
            <form name="filterInputForm" (submit)="submitFilter()">
              <div class="input-group">
                <input id="filter-input" type="text" class="form-control"
                       placeholder="Filter..." [(ngModel)]="queryString"
                       name="queryString"/>
                <div class="input-group-append">
                  <button type="submit" class="btn btn-secondary">Search
                  </button>
                  <button type="button" class="btn btn-secondary"
                          (click)="clearFilter()">Clear
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <br/>

        <div class="row">
          <div class="col-md">

            <button type="button" class="btn btn-secondary mr-2" (click)="refresh()">
              Refresh
            </button>

            <div class="btn-group dropdown">
              <button type="button"
                      class="btn btn-secondary dropdown-toggle"
                      data-toggle="dropdown"
                      aria-haspopup="true"
                      aria-expanded="false">
                Event Type: {{eventTypeFilter.name}}
              </button>
              <div class="dropdown-menu">
                <a *ngFor="let type of eventTypes"
                   class="dropdown-item" href="javascript:void(0);"
                   (click)="setEventTypeFilter(type)">{{type.name}}</a>
              </div>
            </div>

            <div *ngIf="hasEvents()" class="float-right">              
              <button type="button" class="btn btn-secondary mr-2"
                      (click)="gotoNewest()">
                Newest
              </button>
              <button type="button" class="btn btn-secondary mr-2"
                      (click)="gotoNewer()">
                Newer
              </button>
              <button type="button" class="btn btn-secondary mr-2"
                      (click)="gotoOlder()">
                Older
              </button>
              <button type="button" class="btn btn-secondary"
                      (click)="gotoOldest()">
                Oldest
              </button>
            </div>

          </div>
        </div>

        <div *ngIf="error">
          <br/>
          <div class="alert alert-danger text-center">{{error}}</div>
        </div>

        <div *ngIf="!error && !loading && !hasEvents()"
             style="text-align: center;">
          <hr/>
          No events found.
          <hr/>
        </div>

        <br/>

        <evebox-event-table
            (sort)="sortByHeader($event)"
            [eventType]="model.eventType" 
            [rows]="model.events">
        </evebox-event-table>
      </div>`,
    animations: [
        loadingAnimation,
    ]
})
export class EventsComponent implements OnInit, OnDestroy {

    model: any = {
        newestTimestamp: "",
        oldestTimestamp: "",
        events: [],
        eventType: ""
    };

    loading = false;

    queryString = "";

    eventTypes = EVENT_TYPES;

    // Error to be display if set.
    error: string = null;

    eventTypeFilter: any = this.eventTypes[0];

    timeStart: string;
    timeEnd: string;
    sortBy: string;
    private order: string;

    constructor(private route: ActivatedRoute,
                private elasticsearch: ElasticSearchService,
                private mousetrap: MousetrapService,
                private appService: AppService,
                private toastr: ToastrService,
                private api: ApiService,
                private ss: EveboxSubscriptionService) {
    }

    ngOnInit(): any {
        this.ss.subscribe(this, this.route.params, (params: any) => {
            let qp: any = this.route.snapshot.queryParams;

            this.queryString = params.q || qp.q || "";
            this.timeStart = params.minTs || qp.minTs;
            this.timeEnd = params.maxTs || qp.maxTs;

            if (params.eventType) {
                this.setEventTypeFilterByEventType(params.eventType);
            }            

            this.sortBy = params.sortBy || "";
            this.order = params.order;
            this.refresh();
        });

        // Use setTimeout to prevent ExpressionChangedAfterItHasBeenCheckedError.
        setTimeout(() => {
            this.appService.disableTimeRange();
        }, 0);

        this.mousetrap.bind(this, "/", () => this.focusFilterInput());
        this.mousetrap.bind(this, "r", () => this.refresh());
    }

    setEventTypeFilterByEventType(eventType:string) {
        for (let et of this.eventTypes) {
            if (et.eventType == eventType) {
                this.eventTypeFilter = et;                
                break;
            }
        }
    }

    ngOnDestroy() {
        this.mousetrap.unbind(this);
        this.ss.unsubscribe(this);
    }

    focusFilterInput() {
        document.getElementById("filter-input").focus();
    }

    submitFilter() {
        document.getElementById("filter-input").blur();
        this.appService.updateParams(this.route, {
            q: this.queryString
        });
    }

    clearFilter() {
        this.queryString = "";
        this.submitFilter();
    }

    setEventTypeFilter(type: any) {
        this.eventTypeFilter = type;
        this.sortBy = undefined;
        this.order = undefined;
        this.appService.updateParams(this.route, {eventType: this.eventTypeFilter.eventType, sortBy: this.sortBy, order: this.order});
    }

    gotoNewest() {
        this.appService.updateParams(this.route, {
            timeStart: undefined,
            timeEnd: undefined,
            sortBy: undefined,
            order: "desc"
        });
    }

    gotoNewer() {
        this.appService.updateParams(this.route, {
            timeEnd: undefined,
            timeStart: this.model.newestTimestamp,
            sortBy: undefined,
            order: "asc"
        });
    }

    gotoOlder() {
        this.appService.updateParams(this.route, {
            timeEnd: this.model.oldestTimestamp,
            timeStart: undefined,
            sortBy: undefined,
            order: "desc"
        });
    }

    gotoOldest() {
        this.appService.updateParams(this.route, {
            timeEnd: undefined,
            timeStart: undefined,
            sortBy: undefined,
            order: "asc",
        });
    }

    hasEvents(): boolean {
        try {
            return this.model.events.length > 0;
        }
        catch (err) {
            return false;
        }
    }

    refresh() {
        this.clearError();
        this.model.events = [];
        this.model.eventType = this.eventTypeFilter.eventType;
        this.loading = true;        

        this.api.eventQuery({
            queryString: this.queryString,
            maxTs: this.timeEnd,
            minTs: this.timeStart,
            eventType: this.eventTypeFilter.eventType,
            sortOrder: this.order,
            sortBy: this.sortBy
        }).pipe(finalize(() => {
            this.loading = false;
        })).subscribe((response) => {
            let events = response.data;

            // If the sortOrder is "asc", reverse to put back into descending sortOrder.
            // if (this.order == "asc") {
            //     events = events.reverse();
            // }

            if (events.length > 0) {
                this.model.newestTimestamp = events[0]._source["@timestamp"];
                this.model.oldestTimestamp = events[events.length - 1]._source["@timestamp"];
            }
            this.model.events = events;
        }, (error) => {
            this.setError(error);
        });
    }

    private setError(error: string) {
        this.error = error;
    }

    private clearError() {
        this.error = null;
    }

    sortByHeader(field: any) {
        if (this.sortBy !== field) {
            this.sortBy = field;
            this.order = 'desc';
        } else if (this.sortBy === field) {
            if (this.order === 'desc') {
                this.order = 'asc'
            } else {
                this.order = 'desc'
            }
        }

        this.appService.updateParams(this.route, {
            timeEnd: undefined,
            timeStart: undefined,
            sortBy: this.sortBy,
            order: this.order
        });  
    }


}
